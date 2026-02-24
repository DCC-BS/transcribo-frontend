import { db } from "@/stores/db";
import { type StoredTask, StoredTaskSchema, type TaskStatus, TaskStatusEnum } from "~/types/task";

const RETENTION_PERIOD_MS = 24 * 60 * 60 * 1000;

export function useTasks() {
    function getTasks(): Promise<StoredTask[]> {
        return db.tasks.toArray();
    }

    function getTask(id: string): Promise<StoredTask | undefined> {
        return db.tasks.where("id").equals(id).first();
    }

    async function addTask(
        status: TaskStatus,
        mediaFile?: File | Blob,
        mediaFileName?: string,
    ): Promise<StoredTask> {
        const newTask = StoredTaskSchema.parse({
            id: status.task_id,
            status,
            createdAt: new Date(),
        } as StoredTask);

        if (mediaFile) {
            newTask.mediaFile = mediaFile;
            newTask.mediaFileName = mediaFileName ?? "media-file";
        }

        await db.tasks.add(newTask);

        return newTask;
    }

    async function updateTaskStatus(
        id: string,
        status: TaskStatus,
    ): Promise<void> {
        await db.tasks.update(id, { status: status });
    }

    async function deleteTask(id: string) {
        await db.tasks.delete(id);
    }

    async function cleanupOldTask(): Promise<number> {
        const now = new Date();

        return db.tasks
            .filter(
                (t) => !!t.createdAt && now.getTime() - t.createdAt.getTime() > RETENTION_PERIOD_MS,
            )
            .delete();
    }

    async function cleanupFailedAndCanceledTasks() {
        await db.tasks
            .filter(
                (t) =>
                    t.status.status === TaskStatusEnum.FAILED ||
                    t.status.status === TaskStatusEnum.COMPLETED,
            )
            .delete();
    }

    return {
        getTasks,
        getTask,
        addTask,
        deleteTask,
        updateTaskStatus,
        cleanupOldTask,
        cleanupFailedAndCanceledTasks,
    };
}
