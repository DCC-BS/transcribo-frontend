/**
 * Formats time in seconds to MM:SS display
 * @param {number} time - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (time: number): string => {
    const minutes: number = Math.floor(time / 60);
    const seconds: number = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};