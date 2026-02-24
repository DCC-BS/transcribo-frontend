import { v4 as uuid } from "uuid";
import {
    type AddSegmentCommand,
    Cmds,
    DeleteSegmentCommand,
    type InsertSegmentCommand,
    type RenameSpeakerCommand,
    RestoreSegmentCommand,
    TranscriptionNameChangeCommand,
    UpdateSegmentCommand,
} from "~/types/commands";
import type { StoredTranscription } from "~/types/storedTranscription";
import type { SegmentWithId } from "~/types/transcriptionResponse";

export const useTranscriptionService = (
    transcription: Ref<StoredTranscription | undefined>,
) => {
    const logger = useLogger();
    const { onCommand } = useCommandBus();
    const { updateTranscription } = useTranscription();

    onCommand<DeleteSegmentCommand>(
        Cmds.DeleteSegmentCommand,
        async (command) => {
            if (!transcription.value) {
                logger.warn("Current transcription not found");
                return;
            }

            // Find the segment before deleting it to store its data for undo
            const segmentToDelete = transcription.value.segments.find(
                (s) => s.id === command.segmentId,
            );

            if (!segmentToDelete) {
                logger.warn("Segment to delete not found");
                return;
            }

            // Create an undo command with the complete segment data including its ID
            // We'll use RestoreSegmentCommand to restore the deleted segment with its original ID
            const undoCommand = new RestoreSegmentCommand(segmentToDelete);

            // Set the undo command on the delete command
            command.setUndoCommand(undoCommand);

            // Now delete the segment
            transcription.value.segments = transcription.value.segments.filter(
                (s) => s.id !== command.segmentId,
            );

            await updateTranscription(transcription.value.id, {
                segments: transcription.value.segments.map((x) => ({ ...x })),
            });
        },
    );

    onCommand<InsertSegmentCommand>(
        Cmds.InsertSegmentCommand,
        async (command) => {
            if (!transcription.value) {
                logger.warn("Current transcription not found");
                return;
            }

            const targetIndex = transcription.value.segments.findIndex(
                (s) => s.id === command.targetSegmentId,
            );
            if (targetIndex === -1) {
                logger.warn("Target segment not found");
                return;
            }

            const targetSegment = transcription.value.segments[targetIndex];

            if (!targetSegment) {
                logger.warn("Target segment is undefined");
                return;
            }

            const start =
                command.direction === "before"
                    ? targetSegment.start - 2
                    : targetSegment.end;

            const newSegment = {
                id: uuid(),
                start: start,
                end: start + 2,
                text: "",
                ...command.newSegment,
            } as SegmentWithId;

            command.setUndoCommand(new DeleteSegmentCommand(newSegment.id));

            transcription.value.segments.splice(targetIndex, 0, newSegment);

            const newTranscriptions = transcription.value.segments
                .toSorted((a, b) => a.start - b.start)
                .map((x) => ({ ...x }));

            await updateTranscription(transcription.value.id, {
                segments: newTranscriptions,
            });
        },
    );

    onCommand<AddSegmentCommand>(Cmds.AddSegmentCommand, async (command) => {
        if (!transcription.value) {
            logger.warn("Current transcription not found");
            return;
        }

        const newSegment = {
            id: uuid(),
            ...command.newSegment,
        } as SegmentWithId;

        command.setUndoCommand(new DeleteSegmentCommand(newSegment.id));

        transcription.value.segments.push(newSegment);

        const newTranscriptions = transcription.value.segments
            .toSorted((a, b) => a.start - b.start)
            .map((x) => ({ ...x }));

        await updateTranscription(transcription.value.id, {
            segments: newTranscriptions,
        });
    });

    onCommand<UpdateSegmentCommand>(
        Cmds.UpdateSegmentCommand,
        async (command) => {
            if (!transcription.value) {
                logger.warn("Current transcription not found");
                return;
            }

            const segmentIndex = transcription.value.segments.findIndex(
                (s) => s.id === command.segmentId,
            );

            const segment = transcription.value.segments[segmentIndex];

            if (!segment) {
                logger.warn("Target segment not found");
                return;
            }

            const updatedSegment = { ...segment, ...command.updates };
            command.setUndoCommand(
                new UpdateSegmentCommand(command.segmentId, segment),
            );

            const newSegments = transcription.value.segments
                .map((s) =>
                    s.id === command.segmentId
                        ? { ...updatedSegment }
                        : { ...s },
                )
                .sort((a, b) => a.start - b.start);

            transcription.value.segments[segmentIndex] = updatedSegment;

            await updateTranscription(transcription.value.id, {
                segments: newSegments,
            });
        },
    );

    onCommand<TranscriptionNameChangeCommand>(
        Cmds.TranscriptionNameChangeCommand,
        async (command) => {
            if (!transcription.value) {
                logger.warn("Current transcription not found");
                return;
            }

            const oldName = transcription.value.name;
            command.setUndoCommand(new TranscriptionNameChangeCommand(oldName));

            updateTranscription(transcription.value.id, {
                name: command.newName,
            });
        },
    );

    onCommand<RenameSpeakerCommand>(
        Cmds.RenameSpeakerCommand,
        async (command) => {
            if (!transcription.value) {
                logger.warn("Current transcription not found");
                return;
            }

            const newSegments = transcription.value.segments.map((s) =>
                s.speaker === command.oldName
                    ? { ...s, speaker: command.newName }
                    : { ...s },
            );

            updateTranscription(transcription.value.id, {
                segments: newSegments,
            });
        },
    );

    onCommand<RestoreSegmentCommand>(
        Cmds.RestoreSegmentCommand,
        async (command) => {
            if (!transcription.value) {
                logger.warn("Current transcription not found");
                return;
            }

            // Add the restored segment back to the segments array
            transcription.value.segments.push(command.segmentData);

            // Sort segments by start time to maintain proper order
            const newSegments = transcription.value.segments
                .toSorted((a, b) => a.start - b.start)
                .map((x) => ({ ...x }));

            updateTranscription(transcription.value.id, {
                segments: newSegments,
            });
        },
    );
};
