import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import { match } from "ts-pattern";
import { v4 as uuidv4 } from "uuid";
import { db } from "~/stores/db";
import type { MediaProgress } from "~/types/mediaProgress";
import {
    type TaskStatus,
    TaskStatusEnum,
    TaskStatusSchema,
} from "~/types/storedTasks";
import type { Speaker } from "~/types/storedTranscription";
import type { TranscriptionResponse } from "~/types/transcriptionResponse";
import { resolveTranscriptionTitle } from "~/utils/resolveTranscriptionTitle";
import { isVideoFile } from "~/utils/videoUtils";

export function useTaskListener() {
    const { deleteTask } = useTasks();
    const { addTranscription } = getTranscriptionService();
    const { addSegments } = getSegmentService();
    const { showError } = useUserFeedback();
    const { t } = useI18n();
    const logger = useLogger();

    // The four steps of the transcription flow as shown in MediaProgressView:
    // preprocess, upload, transcribe, post-process.
    function createProgressSteps(
        media: File | Blob,
    ): [MediaProgress, MediaProgress, MediaProgress, MediaProgress] {
        return [
            {
                icon: "i-lucide-file",
                message: isVideoFile(media)
                    ? t("upload.extractingAudio")
                    : t("upload.preparingAudio"),
                progress: 0,
            },
            {
                icon: "i-lucide-upload-cloud",
                message: t("upload.uploadingMedia"),
                progress: 0,
            },
            {
                icon: "i-lucide-cpu",
                message: t("task.status.pending"),
                progress: 0,
            },
            {
                icon: "i-lucide-sparkles",
                message: t("task.postProcessing"),
                progress: 0,
            },
        ];
    }

    function createProgress(status: TaskStatus): MediaProgress {
        return {
            icon: "i-lucide-cpu",
            message: status.status ? t(`task.status.${status.status}`) : "",
            progress: calculateProgress(status),
        };
    }

    function calculateProgress(taskStatus: TaskStatus) {
        return match(taskStatus.status)
            .returnType<number>()
            .with(
                TaskStatusEnum.IN_PROGRESS,
                () => (taskStatus.progress ?? 0) * 100,
            )
            .with(TaskStatusEnum.COMPLETED, () => 100)
            .with(TaskStatusEnum.FAILED, () => 100)
            .with(TaskStatusEnum.CANCELLED, () => 0)
            .otherwise(() => 0);
    }

    async function pollTaskStatus(
        taskId: string,
        onProgressUpdate: (progress: MediaProgress) => void,
        onComplete: (transcription: TranscriptionResponse) => void,
        onPostProcessing?: (progress: MediaProgress) => void,
    ) {
        let status = {
            task_id: taskId,
            progress: 0,
            status: TaskStatusEnum.IN_PROGRESS,
        } as TaskStatus;
        try {
            while (status.status === TaskStatusEnum.IN_PROGRESS) {
                status = await fetchTaskStatus(taskId);

                if (status.status !== TaskStatusEnum.IN_PROGRESS) {
                    break;
                }

                onProgressUpdate(createProgress(status));
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }

            if (status.status === TaskStatusEnum.COMPLETED) {
                // Transcription itself is done.
                onProgressUpdate(createProgress(status));
                /*
                    Fetching the result also runs the LLM post-processing
                    (cleanup, keywords, speaker names) on the server, which
                    takes a while. Report it as its own step where the caller
                    provides one; otherwise keep the single step visibly in
                    progress instead of reporting the task as completed while
                    we are still waiting.
                */
                const notifyPostProcessing =
                    onPostProcessing ?? onProgressUpdate;
                notifyPostProcessing({
                    icon: "i-lucide-sparkles",
                    message: t("task.postProcessing"),
                    progress: null,
                });
                const result = await fetchTaskResult(status.task_id);
                notifyPostProcessing({
                    icon: "i-lucide-sparkles",
                    message: t("task.postProcessingDone"),
                    progress: 100,
                });
                onComplete(result);
            } else {
                onProgressUpdate(createProgress(status));
            }
        } catch (e) {
            logger.error(
                e,
                `Poll Task status with id ${status.task_id} failed`,
            );

            status.status = TaskStatusEnum.FAILED;
            onProgressUpdate(createProgress(status));
        }
    }

    async function fetchTaskStatus(taskId: string): Promise<TaskStatus> {
        const newStatus = await apiFetch(`/api/transcribe/${taskId}/status`, {
            schema: TaskStatusSchema,
        });

        if (isApiError(newStatus)) {
            logger.error(newStatus, `Fetch of status with id ${taskId} failed`);
            showError(newStatus);
            return {
                status: TaskStatusEnum.FAILED,
                task_id: taskId,
                progress: 0,
            } as TaskStatus;
        }

        return newStatus;
    }

    async function fetchTaskResult(
        taskId: string,
    ): Promise<TranscriptionResponse> {
        try {
            const response = await fetchTaskResultWithVocabulary(taskId);

            if (isApiError(response)) {
                showError(response);
                throw response;
            }

            return response;
        } catch (e) {
            logger.error(e, `Failed to fetch task result with id ${taskId}`);
            throw e;
        }
    }

    /*
        This will store the transcription and removes the task from the storage.
    */
    async function applyTaskResult(
        taskId: string,
        result: TranscriptionResponse,
        mediaFile: Blob,
        mediaName: string,
    ): Promise<void> {
        /*
            Segments keep the stable diarization key (SPEAKER_00, …); the
            AI-guessed display names go onto the speaker roster instead, in
            first-appearance order — that order fixes each speaker's color
            slot for good.
        */
        const assignedNames = new Map<string, string>();
        for (const assignment of result.speaker_assignments ?? []) {
            const display = assignment.name ?? assignment.role;
            if (display) {
                assignedNames.set(
                    assignment.speaker.trim().toUpperCase(),
                    display,
                );
            }
        }

        function speakerKey(speaker: string | null | undefined): string {
            return (
                speaker?.trim().toUpperCase() || t("transcription.noSpeaker")
            );
        }

        const speakers: Speaker[] = [];
        for (const segment of result.segments) {
            const key = speakerKey(segment.speaker);
            if (!speakers.some((speaker) => speaker.id === key)) {
                speakers.push({ id: key, name: assignedNames.get(key) });
            }
        }

        const proposedKeywords = (result.keywords ?? []).filter((entry) => {
            const pattern = buildTermPattern(entry.term);
            return result.segments.some((segment) =>
                pattern.test(segment.text ?? ""),
            );
        });

        /*
            Also surface stored vocabulary terms that occur in this
            transcription. A vocabulary spelling can be applied as a wrong
            guess (a similar but different name); listing the term with the
            transcription keeps it correctable. Occurrence also refreshes the
            entry's lastUsedAt so LRU eviction keeps relevant terms.
        */
        const vocabulary =
            await getVocabularyService().getVocabularyAsKeywords();
        const proposedTerms = new Set(
            proposedKeywords.map((entry) => entry.term.toLowerCase()),
        );
        const resolvedSpeakerNames = new Set(
            [...assignedNames.values()].map((name) => name.toLowerCase()),
        );
        const usedVocabulary = vocabulary.filter((entry) => {
            if (proposedTerms.has(entry.term.toLowerCase())) {
                return false;
            }
            // Used = occurs in the text or was assigned as a speaker name.
            if (resolvedSpeakerNames.has(entry.term.toLowerCase())) {
                return true;
            }
            const pattern = buildTermPattern(entry.term);
            return result.segments.some((segment) =>
                pattern.test(segment.text ?? ""),
            );
        });
        await getVocabularyService().touchTerms(
            usedVocabulary.map((entry) => entry.term),
        );
        const keywords = [...proposedKeywords, ...usedVocabulary];

        const transcription = await db.transaction(
            "rw",
            [db.transcriptions, db.segments, db.tasks],
            async () => {
                const newTranscription = await addTranscription({
                    mediaFile: mediaFile,
                    mediaFileName: mediaName,
                    name: resolveTranscriptionTitle(result.title, mediaName),
                    keywords,
                    speakers,
                });

                await addSegments(
                    result.segments.map((x) => ({
                        ...x,
                        transcriptionId: newTranscription.id,
                        text: x.text?.trim() ?? "",
                        speaker: speakerKey(x.speaker),
                        id: uuidv4(),
                    })),
                );

                await deleteTask(taskId);

                return newTranscription;
            },
        );

        await navigateTo(`/transcription/${transcription.id}`);
    }

    return {
        createProgressSteps,
        pollTaskStatus,
        applyTaskResult,
    };
}
