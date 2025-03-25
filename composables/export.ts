// Import the StoredTranscription interface
import type { StoredTranscription } from "~/stores/transcriptionsStore";

export const useExport = () => {
    const { currentTranscription } = useCurrentTranscription();
    const logger = useLogger();

    function exportAsText(withSpeakers: boolean) {
        if (!currentTranscription.value) {
            logger.error("No current transcription available for export.");
            return;
        }

        const text = withSpeakers
            ? currentTranscription.value.segments
                  .map(
                      (s) =>
                          `${formatTime(s.start)}  - ${formatTime(s.end)} ${s.speaker}: ${s.text}`,
                  )
                  .join("\n")
            : currentTranscription.value.segments
                  .map(
                      (s) =>
                          `${formatTime(s.start)}  - ${formatTime(s.end)}: s.text`,
                  )
                  .join("\n");
        const blob = new Blob([text], { type: "text/plain" });
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
                const speaker = withSpeakers ? `${s.speaker}:` : "";
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
     * Exports the current transcription as a binary .transcribo file
     * This format preserves all transcription data including metadata
     */
    function exportAsBinary(): void {
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

        // Create binary blob
        const blob = new Blob([jsonString], {
            type: "application/octet-stream",
        });

        // Download file
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentTranscription.value.name}.transcribo`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Imports a .transcribo file and returns the parsed transcription data
     * @param file - The .transcribo file to import
     * @returns Promise with the imported transcription data as a StoredTranscription
     */
    async function importFromBinary(file: File): Promise<StoredTranscription> {
        return new Promise((resolve, reject) => {
            // Validate file type
            if (!file.name.endsWith(".transcribo")) {
                reject(
                    new Error("Invalid file format. Expected .transcribo file"),
                );
                return;
            }

            const reader = new FileReader();

            reader.onload = (event): void => {
                try {
                    if (typeof event.target?.result !== "string") {
                        throw new Error("Failed to read file");
                    }

                    // Parse the JSON data
                    const importedData = JSON.parse(event.target.result);

                    // Validate the imported data structure
                    if (
                        !importedData.name ||
                        !Array.isArray(importedData.segments)
                    ) {
                        throw new Error(
                            "Invalid file format or corrupted file",
                        );
                    }

                    // Create a StoredTranscription object
                    const now = new Date();
                    const storedTranscription: StoredTranscription = {
                        id: importedData.id || crypto.randomUUID(), // Use existing ID or generate new one
                        name: importedData.name,
                        segments: importedData.segments,
                        createdAt: importedData.createdAt
                            ? new Date(importedData.createdAt)
                            : now,
                        updatedAt: now, // Always use current time for updatedAt on import
                        audioFileId: importedData.audioFileId,
                        mediaFileName: importedData.mediaFileName,
                    };

                    resolve(storedTranscription);
                } catch (error) {
                    reject(
                        error instanceof Error
                            ? error
                            : new Error("Unknown error during import"),
                    );
                }
            };

            reader.onerror = (): void => {
                reject(new Error("Failed to read file"));
            };

            // Read the file as text
            reader.readAsText(file);
        });
    }

    return {
        exportAsText,
        exportAsSrt,
        exportAsBinary,
        importFromBinary,
    };
};
