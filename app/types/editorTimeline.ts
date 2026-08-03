import type { StoredSegment } from "~/types/storedSegments";

export interface EditorLaneBlock {
    id: string;
    speaker: string;
    start: number;
    end: number;
    segments: StoredSegment[];
}

export interface EditorLaneChange {
    blockId: string;
    start: number;
    end: number;
    targetSpeaker?: string;
}

export interface EditorLaneContextMenu {
    blockId: string;
    x: number;
    y: number;
}
