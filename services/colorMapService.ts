/**
 * Available color map types for spectrograms and visualizations
 */
export type ColorMapType =
    | 'rainbow'
    | 'grayscale'
    | 'viridis'
    | 'inferno'
    | 'magma';

/**
 * RGB color representation
 */
export interface RGBColor {
    r: number; // Red component (0-255)
    g: number; // Green component (0-255)
    b: number; // Blue component (0-255)
}

/**
 * Service for handling color map calculations
 */
export const colorMapService = {
    /**
     * Maps a normalized value (0-1) to RGB color using the rainbow color scale
     * @param normalizedValue - Value between 0 and 1
     * @returns RGB color object
     */
    rainbow(normalizedValue: number): RGBColor {
        // Ensure value is in valid range
        const value = Math.max(0, Math.min(1, normalizedValue));
        let r = 0,
            g = 0,
            b = 0;

        if (value < 0.2) {
            // Blue to Cyan (0-0.2)
            r = 0;
            g = Math.floor((value / 0.2) * 255);
            b = 255;
        } else if (value < 0.4) {
            // Cyan to Green (0.2-0.4)
            r = 0;
            g = 255;
            b = Math.floor(255 * (1 - (value - 0.2) / 0.2));
        } else if (value < 0.6) {
            // Green to Yellow (0.4-0.6)
            r = Math.floor(255 * ((value - 0.4) / 0.2));
            g = 255;
            b = 0;
        } else if (value < 0.8) {
            // Yellow to Red (0.6-0.8)
            r = 255;
            g = Math.floor(255 * (1 - (value - 0.6) / 0.2));
            b = 0;
        } else {
            // Red to White (0.8-1.0)
            r = 255;
            g = Math.floor(((value - 0.8) / 0.2) * 255);
            b = Math.floor(((value - 0.8) / 0.2) * 255);
        }

        return { r, g, b };
    },

    /**
     * Maps a normalized value (0-1) to RGB color using grayscale
     * @param normalizedValue - Value between 0 and 1
     * @returns RGB color object
     */
    grayscale(normalizedValue: number): RGBColor {
        // Ensure value is in valid range
        const value = Math.max(0, Math.min(1, normalizedValue));
        const intensity = Math.floor(value * 255);
        return { r: intensity, g: intensity, b: intensity };
    },

    /**
     * Maps a normalized value (0-1) to RGB color using the viridis color scale
     * (blue-green-yellow)
     * @param normalizedValue - Value between 0 and 1
     * @returns RGB color object
     */
    viridis(normalizedValue: number): RGBColor {
        // Ensure value is in valid range
        const value = Math.max(0, Math.min(1, normalizedValue));
        let r = 0,
            g = 0,
            b = 0;

        if (value < 0.33) {
            // Dark blue to teal
            const t = value / 0.33;
            r = Math.floor(68 * t);
            g = Math.floor(1 + 84 * t);
            b = Math.floor(84 + (172 - 84) * t);
        } else if (value < 0.66) {
            // Teal to green-yellow
            const t = (value - 0.33) / 0.33;
            r = Math.floor(68 + (49 - 68) * t);
            g = Math.floor(85 + (138 - 85) * t);
            b = Math.floor(172 + (83 - 172) * t);
        } else {
            // Green-yellow to yellow
            const t = (value - 0.66) / 0.34;
            r = Math.floor(49 + (222 - 49) * t);
            g = Math.floor(138 + (215 - 138) * t);
            b = Math.floor(83 * (1 - t));
        }

        return { r, g, b };
    },

    /**
     * Maps a normalized value (0-1) to RGB color using the inferno color scale
     * (black-purple-orange-yellow)
     * @param normalizedValue - Value between 0 and 1
     * @returns RGB color object
     */
    inferno(normalizedValue: number): RGBColor {
        // Ensure value is in valid range
        const value = Math.max(0, Math.min(1, normalizedValue));
        let r = 0,
            g = 0,
            b = 0;

        if (value < 0.25) {
            // Black to purple
            const t = value / 0.25;
            r = Math.floor(20 + 85 * t);
            g = Math.floor(7 + 15 * t);
            b = Math.floor(37 + 65 * t);
        } else if (value < 0.5) {
            // Purple to red
            const t = (value - 0.25) / 0.25;
            r = Math.floor(105 + 85 * t);
            g = Math.floor(22 + 28 * t);
            b = Math.floor(102 - 52 * t);
        } else if (value < 0.75) {
            // Red to orange
            const t = (value - 0.5) / 0.25;
            r = Math.floor(190 + 45 * t);
            g = Math.floor(50 + 100 * t);
            b = Math.floor(50 + 0 * t);
        } else {
            // Orange to yellow
            const t = (value - 0.75) / 0.25;
            r = Math.floor(235 + 20 * t);
            g = Math.floor(150 + 105 * t);
            b = Math.floor(50 + 155 * t);
        }

        return { r, g, b };
    },

    /**
     * Maps a normalized value (0-1) to RGB color using the magma color scale
     * (black-purple-pink-white)
     * @param normalizedValue - Value between 0 and 1
     * @returns RGB color object
     */
    magma(normalizedValue: number): RGBColor {
        // Ensure value is in valid range
        const value = Math.max(0, Math.min(1, normalizedValue));
        let r = 0,
            g = 0,
            b = 0;

        if (value < 0.25) {
            // Dark purple to purple
            const t = value / 0.25;
            r = Math.floor(15 + 75 * t);
            g = Math.floor(5 + 20 * t);
            b = Math.floor(45 + 75 * t);
        } else if (value < 0.5) {
            // Purple to magenta
            const t = (value - 0.25) / 0.25;
            r = Math.floor(90 + 100 * t);
            g = Math.floor(25 + 15 * t);
            b = Math.floor(120 - 10 * t);
        } else if (value < 0.75) {
            // Magenta to pink
            const t = (value - 0.5) / 0.25;
            r = Math.floor(190 + 40 * t);
            g = Math.floor(40 + 100 * t);
            b = Math.floor(110 + 45 * t);
        } else {
            // Pink to white
            const t = (value - 0.75) / 0.25;
            r = Math.floor(230 + 25 * t);
            g = Math.floor(140 + 115 * t);
            b = Math.floor(155 + 100 * t);
        }

        return { r, g, b };
    },

    /**
     * Gets the appropriate color mapping function based on the requested type
     * @param type - The color map type to use
     * @returns Function that converts a normalized value to RGB
     */
    getColorMap(type: ColorMapType): (value: number) => RGBColor {
        switch (type) {
            case 'grayscale':
                return this.grayscale;
            case 'viridis':
                return this.viridis;
            case 'inferno':
                return this.inferno;
            case 'magma':
                return this.magma;
            case 'rainbow':
            default:
                return this.rainbow;
        }
    },
};
