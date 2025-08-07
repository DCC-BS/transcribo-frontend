type formatOptions = {
    /**
     * If true, the time will be formatted with milliseconds
     */
    milliseconds?: boolean;
};

const defaultOptions: formatOptions = {
    milliseconds: true,
};

/**
 * Formats time in seconds to MM:SS display
 * @param {number} time - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (time: number, options?: formatOptions): string => {
    const { milliseconds: useMiliseconds } = { ...defaultOptions, ...options };

    const minutes: number = Math.floor(time / 60);
    const seconds: number = Math.floor(time % 60);
    const milliseconds: number = Math.floor((time % 1) * 1000);

    const secondsString = seconds.toString().padStart(2, "0");
    const millisecondsString = useMiliseconds
        ? milliseconds.toString().padStart(3, "0")
        : "";

    return `${minutes}:${secondsString}${millisecondsString ? `.${millisecondsString}` : ""}`;
};

/**
 * Parses time string in MM: SS format to seconds
 * @param {string} time - Time string in MM: SS format
 * @returns {number} Time in seconds
 *
 * @throws {Error} If time string is invalid
 */
export const parseTime = (time: string): number => {
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
};
