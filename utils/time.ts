/**
 * Formats time in seconds to MM:SS display
 * @param {number} time - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (time: number): string => {
    const minutes: number = Math.floor(time / 60);
    const seconds: number = Math.floor(time % 60);
    const milliseconds: number = Math.floor((time % 1) * 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

/**
 * Parses time string in MM: SS format to seconds
 * @param {string} time - Time string in MM: SS format
 * @returns {number} Time in seconds
 *   
 * @throws {Error} If time string is invalid
 */
export const parseTime = (time: string): number => {
    const parts = time.split(':');
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);


    if (isNaN(minutes) || isNaN(seconds)) {
        throw new Error('Invalid time format');
    }

    return minutes * 60 + seconds;
};