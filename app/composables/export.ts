// Import the StoredTranscription interface
import type { SegementWithId } from "~/types/transcriptionResponse";

export interface ExportOptions {
    withSpeakers: boolean;
    withTimestamps: boolean;
    mergeSegments: boolean; // Only applies to text exports
    withSummary: boolean; // Only applies to text exports
}

export const useExport = () => {
    const { currentTranscription } = useCurrentTranscription();
    const logger = useLogger();

    /**
     * Merges consecutive segments from the same speaker into single segments
     * @param segments - Array of segments to merge
     * @returns Array of merged segments
     */
    function mergeConsecutiveSegments(
        segments: SegementWithId[],
    ): SegementWithId[] {
        if (segments.length === 0) return [];

        const merged: SegementWithId[] = [];
        let currentSegment = { ...segments[0] };

        for (let i = 1; i < segments.length; i++) {
            const nextSegment = segments[i];
            if (!nextSegment) continue;

            // If same speaker and segments are consecutive, merge them
            if (
                currentSegment.speaker === nextSegment.speaker &&
                Math.abs((currentSegment.end ?? 0) - nextSegment.start) < 1.0
            ) {
                currentSegment.text =
                    `${currentSegment.text} ${nextSegment.text}`.trim();
                currentSegment.end = nextSegment.end;
            } else {
                // Different speaker, save current and start new
                merged.push(currentSegment as SegementWithId);
                currentSegment = { ...nextSegment };
            }
        }

        // Don't forget the last segment
        merged.push(currentSegment as SegementWithId);
        return merged;
    }

    function exportAsText(options: ExportOptions) {
        if (!currentTranscription.value) {
            logger.error("No current transcription available for export.");
            return;
        }

        let segments = currentTranscription.value.segments;

        // Merge segments if requested
        if (options.mergeSegments) {
            segments = mergeConsecutiveSegments(segments);
        }

        const transcriptText = segments
            .map((s) => {
                let line = "";

                // Add timestamps if requested
                if (options.withTimestamps) {
                    line += `${formatTime(s.start)} - ${formatTime(s.end)}`;
                }

                // Add speaker if requested
                if (options.withSpeakers) {
                    if (options.withTimestamps) {
                        line += ` ${s.speaker}:`;
                    } else {
                        line += `${s.speaker}:`;
                    }
                }

                // Add separator between metadata and text
                if (options.withTimestamps || options.withSpeakers) {
                    line += " ";
                }

                line += s.text;
                return line;
            })
            .join("\n");

        let finalText = transcriptText;

        // Add summary if requested
        if (options.withSummary && currentTranscription.value?.summary) {
            // Use the stored summary
            finalText = `MEETING SUMMARY:\n${currentTranscription.value.summary}\n\n---\n\nFULL TRANSCRIPT:\n${transcriptText}`;
        }

        const blob = new Blob([finalText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentTranscription.value?.name}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Formats time in SRT format: hours:minutes:seconds,milliseconds
     * @param seconds - Time in seconds
     * @returns Formatted time string in SRT format
     */
    function srtFormatTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds - Math.floor(seconds)) * 1000);

        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${milliseconds.toString().padStart(3, "0")}`;
    }

    function exportAsSrt(withSpeakers: boolean) {
        if (!currentTranscription.value) {
            logger.error("No current transcription available for export.");
            return;
        }

        const srt = currentTranscription.value.segments
            .map((s, i) => {
                const start = srtFormatTime(s.start);
                const end = srtFormatTime(s.end);
                const speaker = withSpeakers ? `${s.speaker}: ` : "";
                return `${i + 1}\n${start} --> ${end}\n${speaker}${s.text}\n`;
            })
            .join("\n");
        const blob = new Blob([srt], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentTranscription.value.name}.srt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Exports the current transcription as a json file
     * This format preserves all transcription data including metadata
     */
    function exportAsJson(): void {
        if (!currentTranscription.value) {
            logger.error("No current transcription available for export.");
            return;
        }

        // Create a serializable object with all transcription data
        const exportData = {
            name: currentTranscription.value.name,
            segments: currentTranscription.value.segments,
            audioFileId: currentTranscription.value.audioFileId,
            createdAt: currentTranscription.value.createdAt,
            mediaFileName: currentTranscription.value.mediaFileName,
            version: "1.0.0", // Adding version for future compatibility
        };

        // Convert to JSON string
        const jsonString = JSON.stringify(exportData);

        // Create json blob
        const blob = new Blob([jsonString], {
            type: "application/json",
        });

        // Download file
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentTranscription.value.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return {
        exportAsText,
        exportAsSrt,
        exportAsJson,
    };
};
