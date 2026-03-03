export function useDateFormatter() {
    function formatDate(timestamp: Date | number): string {
        const date =
            timestamp instanceof Date ? timestamp : new Date(timestamp);
        return date.toLocaleString("de-CH", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    return {
        formatDate,
    };
}
