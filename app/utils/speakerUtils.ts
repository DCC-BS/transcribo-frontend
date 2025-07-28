import type { Segment } from "~/types/transcriptionResponse";

export function getUniqueSpeakers(segments: Segment[]): Set<string> {
    return new Set(segments.map((segment) => segment.speaker ?? "unknown"));
}
