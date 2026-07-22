import { isApiError } from "@dcc-bs/communication.bs.js";
import { liveQuery, type Subscription } from "dexie";
import { db } from "~/stores/db";
import {
    type StoredTask,
    TaskStatusEnum,
    TaskStatusSchema,
} from "~/types/storedTasks";

// The status endpoint can return a transient 5xx while the task keeps
// running fine; only surface an error after this many failed polls in a row.
const FAILURE_THRESHOLD = 3;

export function useInProgressTasksListener() {
    const { getTask, updateTaskStatus, deleteTask } = useTasks();
    const { applyTaskResult } = useTaskListener();
    const { apiFetch } = useApi();
    const { t } = useI18n();
    const logger = useLogger();

    const unfinishedTasks = ref<StoredTask[]>([]);
    const taskErrors = ref<Error[]>([]);

    // taskId -> number of consecutive failed polls.
    const consecutiveFailures = new Map<string, number>();

    let subscription: Subscription | undefined;

    const observable = liveQuery(() =>
        db.tasks
            .filter((t) => t.status.status !== TaskStatusEnum.COMPLETED)
            .toArray(),
    );

    let pollInterval: number | unknown | undefined;

    onMounted(async () => {
        subscription = observable.subscribe({
            next: (result) => {
                unfinishedTasks.value = result;
            },
            error: (error) => showError(error),
        });

        pollInterval = setInterval(() => {
            updateTasks();
        }, 10000);
    });

    onUnmounted(() => {
        subscription?.unsubscribe();
        if (pollInterval) {
            clearInterval(pollInterval as number);
        }
    });

    async function updateTasks() {
        for (const task of unfinishedTasks.value.filter(
            (t) => t.status.status === TaskStatusEnum.IN_PROGRESS,
        )) {
            try {
                const statusResponse = await apiFetch(
                    `/api/transcribe/${task.id}/status`,
                    { schema: TaskStatusSchema },
                );

                if (isApiError(statusResponse)) {
                    throw statusResponse;
                }

                consecutiveFailures.delete(task.id);

                if (statusResponse.status === TaskStatusEnum.COMPLETED) {
                    await processCompletedTask(task);
                } else {
                    updateTaskStatus(task.id, statusResponse);
                }
            } catch (e: unknown) {
                handleTaskError(task, e);
            }
        }
    }

    function handleTaskError(task: StoredTask, e: unknown) {
        const taskId = task.id;
        logger.error(e, `Background poll for task ${taskId} failed`);

        // The server no longer knows this task; retrying can never succeed.
        // Mark it failed so the poll loop stops.
        if (isApiError(e) && e.errorId === "resource_not_found") {
            updateTaskStatus(taskId, {
                ...task.status,
                status: TaskStatusEnum.FAILED,
            });
        } else {
            const failures = (consecutiveFailures.get(taskId) ?? 0) + 1;
            consecutiveFailures.set(taskId, failures);
            if (failures < FAILURE_THRESHOLD) {
                return;
            }
        }

        const message = isApiError(e)
            ? t(`errors.${e.errorId}`)
            : e instanceof Error
              ? e.message
              : String(e);

        if (taskErrors.value.some((err) => err.message === message)) {
            return;
        }
        taskErrors.value.push(new Error(message));
        if (taskErrors.value.length > 5) {
            taskErrors.value = taskErrors.value.slice(-5);
        }
    }

    async function processCompletedTask(task: StoredTask) {
        const transcriptionResponse = await fetchTaskResultWithVocabulary(
            task.id,
        );

        const fullTask = await getTask(task.id);
        if (!fullTask?.mediaFile) {
            throw new Error(t("task.errors.noMediaFile"));
        }

        if (isApiError(transcriptionResponse)) {
            throw new Error(t(`errors.${transcriptionResponse.errorId}`));
        }

        const mediaFileName =
            fullTask.mediaFileName ??
            `transcription-${task.createdAt?.toISOString() ?? task.id}`;
        await applyTaskResult(
            task.id,
            transcriptionResponse,
            fullTask.mediaFile,
            mediaFileName,
        );
        await deleteTask(task.id);
    }

    return {
        unfinishedTasks,
        taskErrors,
    };
}
