import { describe, expect, it } from "vitest";
import {
    TaskStatusEnumSchema,
    TaskStatusSchema,
    TaskStatusEnum,
} from "../../../app/types/task";
import { StoredTranscriptionSchema } from "../../../app/types/storedTranscription";

describe("Task Types", () => {
    describe("TaskStatusEnumSchema", () => {
        it("should validate valid status values", () => {
            expect(TaskStatusEnumSchema.safeParse("in_progress").success).toBe(true);
            expect(TaskStatusEnumSchema.safeParse("completed").success).toBe(true);
            expect(TaskStatusEnumSchema.safeParse("failed").success).toBe(true);
            expect(TaskStatusEnumSchema.safeParse("cancelled").success).toBe(true);
        });

        it("should fail for invalid status values", () => {
            expect(TaskStatusEnumSchema.safeParse("pending").success).toBe(false);
            expect(TaskStatusEnumSchema.safeParse("running").success).toBe(false);
            expect(TaskStatusEnumSchema.safeParse("").success).toBe(false);
        });
    });

    describe("TaskStatusEnum constants", () => {
        it("should have correct values", () => {
            expect(TaskStatusEnum.IN_PROGRESS).toBe("in_progress");
            expect(TaskStatusEnum.COMPLETED).toBe("completed");
            expect(TaskStatusEnum.FAILED).toBe("failed");
            expect(TaskStatusEnum.CANCELLED).toBe("cancelled");
        });
    });

    describe("TaskStatusSchema", () => {
        it("should validate valid task status", () => {
            const task = {
                task_id: "task-123",
                status: "in_progress",
                created_at: "2024-01-01T00:00:00Z",
                executed_at: "2024-01-01T00:01:00Z",
                progress: 0.5,
            };

            const result = TaskStatusSchema.safeParse(task);
            expect(result.success).toBe(true);
        });

        it("should validate with null values", () => {
            const task = {
                task_id: "task-123",
                status: "in_progress",
                created_at: null,
                executed_at: null,
                progress: null,
            };

            const result = TaskStatusSchema.safeParse(task);
            expect(result.success).toBe(true);
        });

        it("should fail for missing required fields", () => {
            const task = {
                task_id: "task-123",
            };

            const result = TaskStatusSchema.safeParse(task);
            expect(result.success).toBe(false);
        });
    });
});

describe("StoredTranscriptionSchema", () => {
    it("should validate valid stored transcription", () => {
        const transcription = {
            id: "trans-123",
            segments: [
                { id: "seg-1", start: 0, end: 5, text: "Hello" },
            ],
            name: "Test Transcription",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
        };

        const result = StoredTranscriptionSchema.safeParse(transcription);
        expect(result.success).toBe(true);
    });

    it("should validate with optional fields", () => {
        const transcription = {
            id: "trans-123",
            segments: [],
            name: "Test",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
            audioFileId: "audio-123",
            mediaFileName: "test.mp3",
            summary: "Test summary",
        };

        const result = StoredTranscriptionSchema.safeParse(transcription);
        expect(result.success).toBe(true);
    });

    it("should convert date strings to Date objects", () => {
        const transcription = {
            id: "trans-123",
            segments: [],
            name: "Test",
            createdAt: "2024-01-15T12:30:00Z",
            updatedAt: "2024-01-15T12:30:00Z",
        };

        const result = StoredTranscriptionSchema.safeParse(transcription);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.createdAt).toBeInstanceOf(Date);
            expect(result.data.updatedAt).toBeInstanceOf(Date);
        }
    });

    it("should fail for missing required fields", () => {
        const transcription = {
            id: "trans-123",
            name: "Test",
        };

        const result = StoredTranscriptionSchema.safeParse(transcription);
        expect(result.success).toBe(false);
    });
});
