import { type TaskStatus, TaskStatusEnum } from "~/types/task";

type BadgeColor =
    | "error"
    | "info"
    | "success"
    | "neutral"
    | "primary"
    | "secondary"
    | "warning";

export function useTaskStatus() {
    const { t } = useI18n();

    function getStatusDisplay(status: TaskStatusEnum): string {
        switch (status) {
            case TaskStatusEnum.IN_PROGRESS:
                return t("processing.status.inProgress");
            case TaskStatusEnum.COMPLETED:
                return t("processing.status.completed");
            case TaskStatusEnum.FAILED:
                return t("processing.status.failed");
            case TaskStatusEnum.CANCELLED:
                return t("processing.status.cancelled");
            default:
                return status;
        }
    }

    function getStatusColor(status: TaskStatusEnum): BadgeColor {
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

    function computeTaskProgress(taskStatus: TaskStatus): number {
        switch (taskStatus.status) {
            case TaskStatusEnum.IN_PROGRESS:
                return typeof taskStatus.progress === "number"
                    ? taskStatus.progress
                    : 0;
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

    return {
        getStatusDisplay,
        getStatusColor,
        computeTaskProgress,
    };
}
