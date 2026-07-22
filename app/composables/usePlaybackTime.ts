/*
    One global playback position shared by every mode (Betrachter, Editor):
    switching modes remounts the view and its media element, but the
    timestamp survives here and the element is seeked back to it.
*/
export function usePlaybackTime(): Ref<number> {
    return useState<number>("playback-current-time", () => 0);
}
