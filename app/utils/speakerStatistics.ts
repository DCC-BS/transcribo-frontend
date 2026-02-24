import type { Segment } from "~/types/transcriptionResponse";

export interface SpeakerStatistics {
    speaker: string;
    duration: number;
    percentage: number;
}

export function computeSpeakerStatistics(
    segments: Segment[],
): SpeakerStatistics[] {
    const speakerDurations = new Map<string, number>();

    let totalDuration = 0;

    for (const segment of segments) {
        const speaker = segment.speaker ?? "unknown";
        const segmentDuration = segment.end - segment.start;

        const currentDuration = speakerDurations.get(speaker) ?? 0;
        speakerDurations.set(speaker, currentDuration + segmentDuration);
        totalDuration += segmentDuration;
    }

    const statistics: SpeakerStatistics[] = [];

    for (const [speaker, duration] of speakerDurations) {
        const percentage =
            totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
        statistics.push({ speaker, duration, percentage });
    }

    statistics.sort((a, b) => b.duration - a.duration);

    return statistics;
}

export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
