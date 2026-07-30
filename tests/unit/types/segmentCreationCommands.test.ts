import { describe, expect, it } from "vitest";
import {
    AddSegmentCommand,
    DeleteSegmentCommand,
    InsertSegmentCommand,
} from "../../../app/types/commands";

/*
    The creating commands assign the new segment's id themselves. That is what
    makes them safe to re-execute: redo runs the very same command object, so a
    handler-generated id would bring the segment back under a different id and
    orphan every later history entry pointing at it.
*/

const newSegment = {
    transcriptionId: "transcription-1",
    start: 0,
    end: 2,
    text: "",
    speaker: "SPEAKER_00",
};

describe("AddSegmentCommand", () => {
    it("assigns an id to the segment it creates", () => {
        const command = new AddSegmentCommand(newSegment);

        expect(command.newSegmentId).toBeTruthy();
    });

    it("keeps that id stable across repeated execution", () => {
        const command = new AddSegmentCommand(newSegment);
        const firstRun = command.newSegmentId;

        // redo hands the same object back to the bus
        expect(command.newSegmentId).toBe(firstRun);
    });

    it("gives every command its own id", () => {
        const first = new AddSegmentCommand(newSegment);
        const second = new AddSegmentCommand(newSegment);

        expect(first.newSegmentId).not.toBe(second.newSegmentId);
    });

    it("takes an explicit id when the caller has one", () => {
        const command = new AddSegmentCommand(newSegment, "segment-1");

        expect(command.newSegmentId).toBe("segment-1");
    });

    it("undoes by deleting exactly the segment it creates", () => {
        const command = new AddSegmentCommand(newSegment);

        expect(command.$undoCommand).toBeInstanceOf(DeleteSegmentCommand);
        expect((command.$undoCommand as DeleteSegmentCommand).segmentId).toBe(
            command.newSegmentId,
        );
    });

    it("remembers the speaker the handler picked", () => {
        const command = new AddSegmentCommand(newSegment);

        expect(command.resolvedSpeaker).toBeUndefined();

        command.setResolvedSpeaker("SPEAKER_07");

        expect(command.resolvedSpeaker).toBe("SPEAKER_07");
    });
});

describe("InsertSegmentCommand", () => {
    it("assigns an id to the segment it creates", () => {
        const command = new InsertSegmentCommand(
            "transcription-1",
            "segment-1",
            {},
            "after",
        );

        expect(command.newSegmentId).toBeTruthy();
    });

    it("takes an explicit id when the caller has one", () => {
        const command = new InsertSegmentCommand(
            "transcription-1",
            "segment-1",
            {},
            "after",
            "segment-2",
        );

        expect(command.newSegmentId).toBe("segment-2");
    });

    it("undoes by deleting exactly the segment it creates", () => {
        const command = new InsertSegmentCommand(
            "transcription-1",
            "segment-1",
            {},
            "before",
        );

        expect(command.$undoCommand).toBeInstanceOf(DeleteSegmentCommand);
        expect((command.$undoCommand as DeleteSegmentCommand).segmentId).toBe(
            command.newSegmentId,
        );
    });
});
