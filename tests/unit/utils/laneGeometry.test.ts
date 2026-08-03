import { describe, expect, it } from "vitest";
import type { EditorLaneBlock } from "../../../app/types/editorTimeline";
import {
    describeLaneChange,
    laneAcceptsBlock,
} from "../../../app/utils/laneGeometry";

function block(
    id: string,
    speaker: string,
    start: number,
    end: number,
): EditorLaneBlock {
    return { id, speaker, start, end, segments: [] };
}

describe("laneAcceptsBlock", () => {
    const moved = block("a", "SPEAKER_00", 10, 12);

    it("accepts an empty lane", () => {
        expect(laneAcceptsBlock([moved], moved, "SPEAKER_01")).toBe(true);
    });

    it("accepts a lane whose blocks do not overlap", () => {
        const blocks = [
            moved,
            block("b", "SPEAKER_01", 0, 10),
            block("c", "SPEAKER_01", 12, 20),
        ];
        expect(laneAcceptsBlock(blocks, moved, "SPEAKER_01")).toBe(true);
    });

    it("accepts the block's own lane — it cannot overlap itself", () => {
        expect(laneAcceptsBlock([moved], moved, "SPEAKER_00")).toBe(true);
    });

    it("rejects a lane with an overlapping block", () => {
        const blocks = [moved, block("b", "SPEAKER_01", 11, 13)];
        expect(laneAcceptsBlock(blocks, moved, "SPEAKER_01")).toBe(false);
    });
});

describe("describeLaneChange", () => {
    const source = block("a", "SPEAKER_00", 10, 14);

    it("reads both edges travelling together as a move", () => {
        const intent = describeLaneChange(source, {
            blockId: "a",
            start: 12,
            end: 16,
        });
        expect(intent.isMove).toBe(true);
        expect(intent.isNoop).toBe(false);
        expect(intent.startDelta).toBeCloseTo(2);
    });

    it("reads one edge travelling as a resize", () => {
        const intent = describeLaneChange(source, {
            blockId: "a",
            start: 10,
            end: 18,
        });
        expect(intent.isMove).toBe(false);
        expect(intent.movedStart).toBe(false);
        expect(intent.movedEnd).toBe(true);
    });

    it("treats a lane change as a move even when the times hold still", () => {
        const intent = describeLaneChange(source, {
            blockId: "a",
            start: 10,
            end: 14,
            targetSpeaker: "SPEAKER_01",
        });
        expect(intent.isMove).toBe(true);
        expect(intent.isNoop).toBe(false);
    });

    it("reports a drag that snapped back as a noop", () => {
        const intent = describeLaneChange(source, {
            blockId: "a",
            start: 10.0004,
            end: 14.0004,
        });
        expect(intent.isNoop).toBe(true);
    });

    it("reports dropping a block back into its own lane as a noop", () => {
        const intent = describeLaneChange(source, {
            blockId: "a",
            start: 10,
            end: 14,
            targetSpeaker: "SPEAKER_00",
        });
        expect(intent.isNoop).toBe(true);
    });
});
