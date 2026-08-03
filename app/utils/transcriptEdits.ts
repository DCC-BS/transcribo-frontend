import type { StoredSegment } from "~/types/storedSegments";

interface TranscriptTextUpdate {
    segmentId: string;
    text: string;
}

interface TranscriptEditPlan {
    deletedSegmentIds: string[];
    textUpdates: TranscriptTextUpdate[];
}

/**
 * Convert one editor sync into data mutations. Deletions are collected so the
 * caller can record a multi-segment deletion as one history entry, while text
 * changes remain independent reversible commands.
 */
export function planTranscriptEdits(
    segments: Pick<StoredSegment, "id" | "text">[],
    documentTexts: ReadonlyMap<string, string>,
): TranscriptEditPlan {
    const deletedSegmentIds: string[] = [];
    const textUpdates: TranscriptTextUpdate[] = [];
    const documentHasContent = documentTexts.size > 0;

    for (const segment of segments) {
        const text = documentTexts.get(segment.id);
        if (text === undefined) {
            if (documentHasContent) {
                deletedSegmentIds.push(segment.id);
            }
            continue;
        }
        if (text === segment.text) {
            continue;
        }
        if (text.trim() === "") {
            deletedSegmentIds.push(segment.id);
            continue;
        }
        textUpdates.push({ segmentId: segment.id, text });
    }

    return { deletedSegmentIds, textUpdates };
}
