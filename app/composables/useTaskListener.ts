import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";
import { match } from "ts-pattern";
import type { MediaProgress } from "~/types/mediaProgress";
import {
    type TaskStatus,
    TaskStatusEnum,
    TaskStatusSchema,
} from "~/types/task";
import {
    type TranscriptionResponse,
    TranscriptionResponseSchema,
} from "~/types/transcriptionResponse";
import { v4 as uuidv4 } from "uuid";

export function useTaskListener() {
    const taskStore = useTasksStore();
    const transcriptionsStore = useTranscriptionsStore();
    const { showError } = useUserFeedback();
    const { t } = useI18n();
    const logger = useLogger();

    function createProgress(status: TaskStatus): MediaProgress {
        return {
            icon: "i-lucide-cpu",
            message: status.status ?? "",
            progress: calculateProgress(status),
        };
    }

    function calculateProgress(taskStatus: TaskStatus) {
        return match(taskStatus.status)
            .returnType<number>()
            .with(TaskStatusEnum.IN_PROGRESS, () => taskStatus.progress ?? 0)
            .with(TaskStatusEnum.COMPLETED, () => 1)
            .with(TaskStatusEnum.FAILED, () => 1)
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
            created_at: "",
            executed_at: "",
            progress: 0,
            status: TaskStatusEnum.IN_PROGRESS
        } as TaskStatus;
        try {

            while (status.status === TaskStatusEnum.IN_PROGRESS) {
                status = await fetchTaskStatus(taskId);
                onProgressUpdate(createProgress(status));

                if (status.status !== TaskStatusEnum.IN_PROGRESS) {
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, 5000));
            }

            if (status.status === TaskStatusEnum.COMPLETED) {
                const result = await fetchTaskResult(status.task_id);
                onComplete(result);
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
                created_at: "",
                executed_at: "",
                progress: 0,
            };
        }

        return newStatus;
    }

    async function fetchTaskResult(
        taskId: string,
    ): Promise<TranscriptionResponse> {
        try {
            const response = await apiFetch(`/api/transcribe/${taskId}`, {
                schema: TranscriptionResponseSchema,
            });

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
        mediaName: string
    ): Promise<void> {
        const transcription = await transcriptionsStore.addTranscription({
            segments: result.segments.map((x) => ({
                ...x,
                text: x.text?.trim() ?? "",
                speaker:
                    x.speaker?.trim().toUpperCase() ??
                    t("transcription.noSpeaker"),
                id: uuidv4(),
            })),
            mediaFile: mediaFile,
            mediaFileName: mediaName,
            name: mediaName ?? t("transcription.untitled"),
        });

        await taskStore.deleteTask(taskId);
        await navigateTo(`/transcription/${transcription.id}`);
    }

    return {
        pollTaskStatus,
        applyTaskResult
    };
}
