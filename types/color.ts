/**
 * RGB color representation
 */
export class RGBColor {
    constructor(public readonly r: number, public readonly g: number, public readonly b: number) {
    }

    /**
     * Returns a CSS string representation of the color
     */
    toString(): string {
        return `rgb(${this.r}, ${this.g}, ${this.b})`;
    }
}