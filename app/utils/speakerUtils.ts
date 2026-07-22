import type { Segment } from "~/types/transcriptionResponse";

export function getUniqueSpeakers(segments: Segment[]): Set<string> {
    return new Set(segments.map((segment) => segment.speaker ?? "unknown"));
}

/**
 * Next free diarization-style speaker label (SPEAKER_00, SPEAKER_01, …).
 * Continues past the highest existing index so a fresh segment always gets
 * a unique speaker.
 */
export function nextSpeakerName(
    existing: Iterable<string | null | undefined>,
): string {
    let highest = -1;
    for (const name of existing) {
        const match = /^SPEAKER_(\d+)$/i.exec(name?.trim() ?? "");
        if (match?.[1]) {
            highest = Math.max(highest, Number.parseInt(match[1], 10));
        }
    }
    return `SPEAKER_${(highest + 1).toString().padStart(2, "0")}`;
}
