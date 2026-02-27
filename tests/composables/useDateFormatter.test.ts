import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useDateFormatter } from "../../../app/composables/useDateFormatter";

describe("useDateFormatter", () => {
    let originalToLocaleString: typeof Date.prototype.toLocaleString;

    beforeEach(() => {
        originalToLocaleString = Date.prototype.toLocaleString;
    });

    afterEach(() => {
        Date.prototype.toLocaleString = originalToLocaleString;
    });

    describe("formatDate", () => {
        it("should format Date object", () => {
            const { formatDate } = useDateFormatter();
            const date = new Date("2024-01-15T14:30:00");

            const result = formatDate(date);

            expect(result).toContain("15");
            expect(result).toContain("14:30");
        });

        it("should format timestamp number", () => {
            const { formatDate } = useDateFormatter();
            const timestamp = new Date("2024-06-20T09:15:00").getTime();

            const result = formatDate(timestamp);

            expect(result).toContain("20");
            expect(result).toContain("09:15");
        });

        it("should use de-CH locale", () => {
            const { formatDate } = useDateFormatter();
            const date = new Date("2024-03-05T16:45:00");

            Date.prototype.toLocaleString = vi.fn().mockReturnValue("5 Mar 16:45");

            formatDate(date);

            expect(Date.prototype.toLocaleString).toHaveBeenCalledWith(
                "de-CH",
                expect.objectContaining({
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                })
            );
        });

        it("should handle different dates", () => {
            const { formatDate } = useDateFormatter();

            const result1 = formatDate(new Date("2024-01-01T00:00:00"));
            const result2 = formatDate(new Date("2024-12-31T23:59:59"));

            expect(result1).not.toBe(result2);
        });

        it("should handle same timestamp as number and Date", () => {
            const { formatDate } = useDateFormatter();
            const date = new Date("2024-07-10T12:00:00");
            const timestamp = date.getTime();

            Date.prototype.toLocaleString = vi.fn().mockReturnValue("10 Jul 12:00");

            const result1 = formatDate(date);
            const result2 = formatDate(timestamp);

            expect(result1).toBe(result2);
        });
    });
});
