/**
 * Enum representing the possible states of a task
 * Corresponds to the Python TaskStatusEnum
 */
export enum TaskStatusEnum {
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
}

/**
 * Interface representing a task status
 * Corresponds to the Python TaskStatus model
 */
export interface TaskStatus {
    task_id: string;
    status: TaskStatusEnum;
    created_at: string | null; // ISO date string or null
    executed_at: string | null; // ISO date string or null
    progress: number | null;
}
