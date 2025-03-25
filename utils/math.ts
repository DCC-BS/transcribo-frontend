/**
 * Clamps a value between a minimum and maximum value
 * @param value - The value to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Clamps a value between 0 and 1
 * @param value - The value to clamp
 * @returns The clamped value between 0 and 1
 */
export function clamp01(value: number): number {
    return clamp(value, 0, 1);
}

/**
 * Maps a value from one range to another
 * @param value - The value to map
 * @param inMin - The minimum value of the input range
 * @param inMax - The maximum value of the input range
 * @param outMin - The minimum value of the output range
 * @param outMax - The maximum value of the output range
 * @returns The mapped value in the output range
 */
export function mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
): number {
    // First map the value to 0-1 range
    const normalizedValue = (value - inMin) / (inMax - inMin);
    // Then map to the output range
    return outMin + normalizedValue * (outMax - outMin);
}
