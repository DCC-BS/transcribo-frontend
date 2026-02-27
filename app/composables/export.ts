// Import the StoredTranscription interface
import type { StoredTranscription } from "~/types/storedTranscription";
import type { SegmentWithId } from "~/types/transcriptionResponse";

export interface ExportOptions {
    transciption: StoredTranscription;
    withSpeakers: boolean;
    withTimestamps: boolean;
    mergeSegments: boolean; // Only applies to text exports
    withSummary: boolean; // Only applies to text exports
}

export const useExport = () => {
    /**
     * Merges consecutive segments from the same speaker into single segments
     * @param segments - Array of segments to merge
     * @returns Array of merged segments
     */
    function mergeConsecutiveSegments(
        segments: SegmentWithId[],
    ): SegmentWithId[] {
        if (segments.length === 0) return [];

        const merged: SegmentWithId[] = [];
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
                merged.push(currentSegment as SegmentWithId);
                currentSegment = { ...nextSegment };
            }
        }

        // Don't forget the last segment
        merged.push(currentSegment as SegmentWithId);
        return merged;
    }

    function exportAsText(options: ExportOptions) {
        let segments = options.transciption.segments;

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
        if (options.withSummary && options.transciption.summary) {
            // Use the stored summary
            finalText = `MEETING SUMMARY:\n${options.transciption.summary}\n\n---\n\nFULL TRANSCRIPT:\n${transcriptText}`;
        }

        const blob = new Blob([finalText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${options.transciption.name}.txt`;
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

    function exportAsSrt(
        transciption: StoredTranscription,
        withSpeakers: boolean,
    ) {
        const srt = transciption.segments
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
        a.download = `${transciption.name}.srt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Exports the current transcription as a json file
     * This format preserves all transcription data including metadata
     */
    function exportAsJson(transciption: StoredTranscription): void {
        // Create a serializable object with all transcription data
        const exportData = {
            name: transciption.name,
            segments: transciption.segments,
            audioFileId: transciption.audioFileId,
            createdAt: transciption.createdAt,
            mediaFileName: transciption.mediaFileName,
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
        a.download = `${transciption.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function exportAsDocx(options: ExportOptions) {
        let segments = options.transciption.segments;

        if (options.mergeSegments) {
            segments = mergeConsecutiveSegments(segments);
        }

        const transcriptMarkdown = segments
            .map((s) => {
                let line = "";

                if (options.withTimestamps) {
                    line += `*[${formatTime(s.start)} - ${formatTime(s.end)}]* `;
                }

                if (options.withSpeakers) {
                    line += `**${s.speaker}:** `;
                }

                line += s.text;
                return line;
            })
            .join("\n\n");

        let markdown = `# ${options.transciption.name}\n\n`;

        if (options.withSummary && options.transciption.summary) {
            markdown += `## Meeting Summary\n\n${options.transciption.summary}\n\n---\n\n`;
        }

        markdown += `## Transcript\n\n${transcriptMarkdown}`;

        const blob = await markdownToDocx(markdown);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${options.transciption.name}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function exportSummaryAsDocx(transciption: StoredTranscription) {
        if (!transciption.summary) return;

        const markdown = `# ${transciption.name}\n\n${transciption.summary}`;
        const blob = await markdownToDocx(markdown);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${transciption.name}-summary.docx`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return {
        exportAsText,
        exportAsSrt,
        exportAsJson,
        exportAsDocx,
        exportSummaryAsDocx,
    };
};
