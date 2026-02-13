import { z } from "zod";

/**
 * Zod schema for TaskStatusEnum
 * Represents the possible states of a task
 * Corresponds to the Python TaskStatusEnum
 */
export const TaskStatusEnumSchema = z.enum([
    "in_progress",
    "completed",
    "failed",
    "cancelled",
]);

/**
 * Enum representing the possible states of a task
 * Inferred from TaskStatusEnumSchema
 */
export type TaskStatusEnum = z.infer<typeof TaskStatusEnumSchema>;

/**
 * Enum object for convenient access to task status values
 */
export const TaskStatusEnum = {
    IN_PROGRESS: "in_progress" as const,
    COMPLETED: "completed" as const,
    FAILED: "failed" as const,
    CANCELLED: "cancelled" as const,
} as const;

/**
 * Zod schema for TaskStatus
 * Represents a task status
 * Corresponds to the Python TaskStatus model
 */
export const TaskStatusSchema = z.object({
    task_id: z.string(),
    status: TaskStatusEnumSchema,
    created_at: z.string().nullable(), // ISO date string or null
    executed_at: z.string().nullable(), // ISO date string or null
    progress: z.number().nullable(),
});

/**
 * Type representing a task status
 * Inferred from TaskStatusSchema
 */
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export interface StoredTask {
    id: string;
    status: TaskStatus;
    mediaFile?: Blob;
    mediaFileName?: string;
    createdAt?: number; // Timestamp when task was created
}
