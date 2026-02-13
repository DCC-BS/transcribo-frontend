import { db } from "@/stores/db";
import { TaskStatusEnum, type TaskStatus } from "~/types/task";

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

        const newTask: StoredTask = {
            id: status.task_id,
            status,
            createdAt: Date.now()
        };

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
        const now = Date.now();

        return db.tasks.filter((t) => !!t.createdAt && now - t.createdAt > RETENTION_PERIOD_MS).delete()
    }

    async function cleanupFailedAndCanceledTasks() {
        await db.tasks
            .filter((t) => t.status === TaskStatusEnum.FAILED || t.status === TaskStatusEnum.COMPLETED)
            .delete()
    }

    return {
        getTasks,
        getTask,
        addTask,
        deleteTask,
        updateTaskStatus,
        cleanupOldTask,
        cleanupFailedAndCanceledTasks
    }
}
