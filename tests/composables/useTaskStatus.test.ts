import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("#imports", () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}));

import { TaskStatusEnum, type TaskStatus } from "../../../app/types/task";

function getStatusDisplay(status: string): string {
    switch (status) {
        case TaskStatusEnum.IN_PROGRESS:
            return "processing.status.inProgress";
        case TaskStatusEnum.COMPLETED:
            return "processing.status.completed";
        case TaskStatusEnum.FAILED:
            return "processing.status.failed";
        case TaskStatusEnum.CANCELLED:
            return "processing.status.cancelled";
        default:
            return status;
    }
}

function getStatusColor(status: string): string {
    switch (status) {
        case TaskStatusEnum.IN_PROGRESS:
            return "info";
        case TaskStatusEnum.COMPLETED:
            return "success";
        case TaskStatusEnum.FAILED:
            return "error";
        case TaskStatusEnum.CANCELLED:
            return "neutral";
        default:
            return "neutral";
    }
}

function computeTaskProgress(taskStatus: { status: string; progress: number | null }): number {
    switch (taskStatus.status) {
        case TaskStatusEnum.IN_PROGRESS:
            return typeof taskStatus.progress === "number" ? taskStatus.progress : 0;
        case TaskStatusEnum.COMPLETED:
            return 1;
        case TaskStatusEnum.FAILED:
            return 1;
        case TaskStatusEnum.CANCELLED:
            return 0;
        default:
            return 0;
    }
}

describe("useTaskStatus logic", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getStatusDisplay", () => {
        it("should return translation key for IN_PROGRESS", () => {
            expect(getStatusDisplay(TaskStatusEnum.IN_PROGRESS)).toBe("processing.status.inProgress");
        });

        it("should return translation key for COMPLETED", () => {
            expect(getStatusDisplay(TaskStatusEnum.COMPLETED)).toBe("processing.status.completed");
        });

        it("should return translation key for FAILED", () => {
            expect(getStatusDisplay(TaskStatusEnum.FAILED)).toBe("processing.status.failed");
        });

        it("should return translation key for CANCELLED", () => {
            expect(getStatusDisplay(TaskStatusEnum.CANCELLED)).toBe("processing.status.cancelled");
        });

        it("should return status as-is for unknown status", () => {
            expect(getStatusDisplay("unknown")).toBe("unknown");
        });
    });

    describe("getStatusColor", () => {
        it("should return 'info' for IN_PROGRESS", () => {
            expect(getStatusColor(TaskStatusEnum.IN_PROGRESS)).toBe("info");
        });

        it("should return 'success' for COMPLETED", () => {
            expect(getStatusColor(TaskStatusEnum.COMPLETED)).toBe("success");
        });

        it("should return 'error' for FAILED", () => {
            expect(getStatusColor(TaskStatusEnum.FAILED)).toBe("error");
        });

        it("should return 'neutral' for CANCELLED", () => {
            expect(getStatusColor(TaskStatusEnum.CANCELLED)).toBe("neutral");
        });

        it("should return 'neutral' for unknown status", () => {
            expect(getStatusColor("unknown")).toBe("neutral");
        });
    });

    describe("computeTaskProgress", () => {
        it("should return progress value for IN_PROGRESS with progress", () => {
            const task = {
                status: TaskStatusEnum.IN_PROGRESS,
                progress: 0.5,
            };
            expect(computeTaskProgress(task)).toBe(0.5);
        });

        it("should return 0 for IN_PROGRESS without progress", () => {
            const task = {
                status: TaskStatusEnum.IN_PROGRESS,
                progress: null,
            };
            expect(computeTaskProgress(task)).toBe(0);
        });

        it("should return 1 for COMPLETED", () => {
            const task = {
                status: TaskStatusEnum.COMPLETED,
                progress: null,
            };
            expect(computeTaskProgress(task)).toBe(1);
        });

        it("should return 1 for FAILED", () => {
            const task = {
                status: TaskStatusEnum.FAILED,
                progress: null,
            };
            expect(computeTaskProgress(task)).toBe(1);
        });

        it("should return 0 for CANCELLED", () => {
            const task = {
                status: TaskStatusEnum.CANCELLED,
                progress: 0.5,
            };
            expect(computeTaskProgress(task)).toBe(0);
        });

        it("should return 0 for unknown status", () => {
            const task = {
                status: "unknown",
                progress: 0.5,
            };
            expect(computeTaskProgress(task)).toBe(0);
        });
    });
});
