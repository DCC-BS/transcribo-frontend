/*
    Canvas colors read from the current CSS theme. Kept in one place so the
    Konva shapes and the HTML overlays always agree on the palette.
*/
export function useLaneTheme() {
    const theme = reactive({
        background: "#ffffff",
        muted: "#f5f5f5",
        border: "#d4d4d4",
        text: "#171717",
        dimmed: "#737373",
        primary: "#673ab7",
        error: "#dc2626",
    });

    /**
     * Re-reads the canvas colors from the current CSS theme.
     */
    function readTheme(): void {
        const styles = getComputedStyle(document.documentElement);
        function value(name: string, fallback: string): string {
            return styles.getPropertyValue(name).trim() || fallback;
        }
        theme.background = value("--ui-bg", theme.background);
        theme.muted = value("--ui-bg-muted", theme.muted);
        theme.border = value("--ui-border", theme.border);
        theme.text = value("--ui-text", theme.text);
        theme.dimmed = value("--ui-text-dimmed", theme.dimmed);
        theme.primary = value("--ui-primary", theme.primary);
        theme.error = value("--ui-error", theme.error);
    }

    return { theme, readTheme };
}
