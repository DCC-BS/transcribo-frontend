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

export interface EditorLaneCanvasProps {
    speakers: {
        ids: string[];
        colors: Record<string, string>;
    };
    blocks: EditorLaneBlock[];
    timeline: {
        duration: number;
        currentTime: number;
    };
    viewport: {
        height: number;
        labelWidth: number;
    };
    active: {
        blockId?: string;
        speaker?: string;
        autoScroll?: boolean;
    };
}
