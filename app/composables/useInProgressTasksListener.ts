import { isApiError } from "@dcc-bs/communication.bs.js";
import { liveQuery, type Subscription } from "dexie";
import { db } from "~/stores/db";
import { type StoredTask, TaskStatusEnum, TaskStatusSchema } from "~/types/task";
import { TranscriptionResponseSchema } from "~/types/transcriptionResponse";

export function useInProgressTasksListener() {
    const { getTask, updateTaskStatus, deleteTask } = useTasks();
    const { applyTaskResult } = useTaskListener();
    const { apiFetch } = useApi();
    const { t } = useI18n();

    const unfinishedTasks = ref<StoredTask[]>([]);
    const taskErrors = ref<Error[]>([]);

    let subscription: Subscription | undefined;

    const observable = liveQuery(() =>
        db.tasks.filter((t) => t.status.status === TaskStatusEnum.IN_PROGRESS).toArray(),
    );

    let pollInterval: number | unknown | undefined;

    onMounted(async () => {
        subscription = observable.subscribe({
            next: (result) => {
                console.log(result);
                unfinishedTasks.value = result;
            },
            error: (error) => showError(error),
        });

        pollInterval = setInterval(() => {
            updateTasks();
        }, 10000)
    });

    onUnmounted(() => {
        subscription?.unsubscribe();
        if (pollInterval) {
            clearInterval(pollInterval as number);
        }
    });

    async function updateTasks() {
        for (const task of unfinishedTasks.value) {
            try {
                const statusResponse = await apiFetch(
                    `/api/transcribe/${task.id}/status`,
                    { schema: TaskStatusSchema },
                );

                if (isApiError(statusResponse)) {
                    throw statusResponse;
                }

                if (statusResponse.status === TaskStatusEnum.COMPLETED) {
                    processCompletedTask(task);
                } else {
                    updateTaskStatus(task.id, statusResponse);
                }
            } catch (e: unknown) {
                if (e instanceof Error) {
                    taskErrors.value.push(e);
                } else {
                    taskErrors.value.push(new Error(String(e)));
                }
            }
        }
    }

    async function processCompletedTask(task: StoredTask) {
        const transcriptionResponse = await apiFetch(
            `/api/transcribe/${task.id}`,
            { schema: TranscriptionResponseSchema },
        );

        const fullTask = await getTask(task.id);
        if (!fullTask?.mediaFile) {
            throw new Error(t("task.errors.noMediaFile"));
        }

        if (isApiError(transcriptionResponse)) {
            throw new Error(t(`errors.${transcriptionResponse.errorId}`));
        }

        const mediaFileName = fullTask.mediaFileName ?? `transcription-${task.createdAt?.toISOString() ?? task.id}`;
        await applyTaskResult(task.id, transcriptionResponse, fullTask.mediaFile, mediaFileName);
        await deleteTask(task.id);
    }

    return {
        unfinishedTasks,
        taskErrors,
    }
}
