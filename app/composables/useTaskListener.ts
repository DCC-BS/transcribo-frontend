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
import type { TranscriptionResponse } from "~/types/transcriptionResponse";

export function useTaskListener() {
    const { deleteTask } = useTasks();
    const { addTranscription } = getTranscriptionService();
    const { addSegments } = getSegmentService();
    const { showError } = useUserFeedback();
    const { t } = useI18n();
    const logger = useLogger();

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
                /*
                    Fetching the result also runs the LLM post-processing
                    (cleanup, keywords, speaker names) on the server, which
                    takes a while. Keep the step visibly in progress instead of
                    reporting the task as completed while we are still waiting.
                */
                onProgressUpdate({
                    icon: "i-lucide-cpu",
                    message: t("task.postProcessing"),
                    progress: null,
                });
                const result = await fetchTaskResult(status.task_id);
                onProgressUpdate(createProgress(status));
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

        function resolveSpeaker(speaker: string | null | undefined): string {
            const label = speaker?.trim().toUpperCase();
            if (!label) {
                return t("transcription.noSpeaker");
            }
            return assignedNames.get(label) ?? label;
        }

        const keywords = (result.keywords ?? []).filter((entry) => {
            const pattern = buildTermPattern(entry.term);
            return result.segments.some((segment) =>
                pattern.test(segment.text ?? ""),
            );
        });

        const transcription = await db.transaction(
            "rw",
            [db.transcriptions, db.segments, db.tasks],
            async () => {
                const newTranscription = await addTranscription({
                    mediaFile: mediaFile,
                    mediaFileName: mediaName,
                    name: mediaName ?? t("transcription.untitled"),
                    keywords,
                });

                await addSegments(
                    result.segments.map((x) => ({
                        ...x,
                        transcriptionId: newTranscription.id,
                        text: x.text?.trim() ?? "",
                        speaker: resolveSpeaker(x.speaker),
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
        pollTaskStatus,
        applyTaskResult,
    };
}
