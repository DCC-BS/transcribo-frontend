type formatOptions = {
    /**
     * If true, the time will be formatted with milliseconds
     */
    milliseconds?: boolean;
    /** Minimum digits used for minutes when hours are not shown. */
    minimumMinuteDigits?: number;
};

const defaultFormatOptions: formatOptions = {
    milliseconds: true,
};

/**
 * Formats time in seconds to M:SS display, or H:MM:SS once the time
 * reaches an hour (recordings can be up to two hours long).
 * @param {number} time - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(time: number, options?: formatOptions): string {
    const { milliseconds: useMilliseconds } = {
        ...defaultFormatOptions,
        ...options,
    };

    const hours: number = Math.floor(time / 3600);
    const minutes: number = Math.floor((time % 3600) / 60);
    const seconds: number = Math.floor(time % 60);
    const milliseconds: number = Math.floor((time % 1) * 1000);

    const secondsString = seconds.toString().padStart(2, "0");
    const suffix = useMilliseconds
        ? `.${milliseconds.toString().padStart(3, "0")}`
        : "";
    const head =
        hours > 0
            ? `${hours}:${minutes.toString().padStart(2, "0")}`
            : minutes
                  .toString()
                  .padStart(options?.minimumMinuteDigits ?? 1, "0");

    return `${head}:${secondsString}${suffix}`;
}

/**
 * Parses time string in MM: SS format to seconds
 * @param {string} time - Time string in MM: SS format
 * @returns {number} Time in seconds
 *
 * @throws {Error} If time string is invalid
 */
export function parseTime(time: string): number {
    const parts = time.split(":") as [string, string];

    if (parts.length !== 2) {
        throw new Error("Invalid time format");
    }

    const minutes = Number.parseInt(parts[0], 10);
    const seconds = Number.parseInt(parts[1], 10);

    if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
        throw new Error("Invalid time format");
    }

    return minutes * 60 + seconds;
}
