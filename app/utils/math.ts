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
