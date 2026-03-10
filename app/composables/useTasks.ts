import { db } from "@/stores/db";
import {
    type StoredTask,
    StoredTaskSchema,
    type TaskStatus,
} from "~/types/task";

const RETENTION_PERIOD_MS = 24 * 60 * 60 * 1000;

export function useTasks() {
    function getTasks(): Promise<StoredTask[]> {
        return db.tasks.toArray();
    }

    function getTask(id: string): Promise<StoredTask | undefined> {
        return db.tasks.where("id").equals(id).first();
    }

    function getTasksByStatus(status: TaskStatusEnum): Promise<StoredTask[]> {
        return db.tasks
            .filter((task) => task.status.status === status)
            .toArray();
    }

    async function addTask(
        status: TaskStatus,
        mediaFile?: File | Blob,
        mediaFileName?: string,
        mediaFileType?: string,
    ): Promise<StoredTask> {
        const newTask = StoredTaskSchema.parse({
            id: status.task_id,
            status,
            createdAt: new Date(),
        } as StoredTask);

        if (mediaFile) {
            newTask.mediaFile = mediaFile;
            newTask.mediaFileName = mediaFileName ?? "media-file";
            newTask.mediaType = mediaFileType ?? mediaFile.type;
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
                (t) =>
                    !!t.createdAt &&
                    now.getTime() - t.createdAt.getTime() > RETENTION_PERIOD_MS,
            )
            .delete();
    }

    return {
        getTasks,
        getTask,
        getTasksByStatus,
        addTask,
        deleteTask,
        updateTaskStatus,
        cleanupOldTask,
    };
}
