import { v4 as uuid } from "uuid";
import { db } from "~/stores/db";
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
import type { StoredSegment } from "~/types/storedSegments";

export const useTranscriptionCommandHandler = () => {
    const logger = useLogger();
    const { onCommand } = useCommandBus();
    const { updateTranscription } = getTranscriptionService();
    const { getSegment, deleteSegment, updateSegment, putSegment, addSegment } =
        getSegmentService();

    onCommand<DeleteSegmentCommand>(
        Cmds.DeleteSegmentCommand,
        async (command) => {
            const segmentToDelete = await getSegment(command.segmentId);

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
            await deleteSegment(command.segmentId);
        },
    );

    onCommand<InsertSegmentCommand>(
        Cmds.InsertSegmentCommand,
        async (command) => {
            const targetSegment = await getSegment(command.targetSegmentId);

            if (!targetSegment) {
                logger.warn("Target segment is undefined");
                return;
            }

            const start =
                command.direction === "before"
                    ? targetSegment.start - 2
                    : targetSegment.end;

            const newSegment = {
                start: start,
                end: start + 2,
                text: "",
                transcriptionId: command.transcriptionId,
                ...command.newSegment,
            } as Omit<StoredSegment, "id">;

            const createdSegment = await addSegment(newSegment);
            command.setUndoCommand(new DeleteSegmentCommand(createdSegment.id));

        },
    );

    onCommand<AddSegmentCommand>(Cmds.AddSegmentCommand, async (command) => {
        const newSegment = {
            id: uuid(),
            ...command.newSegment,
        } as StoredSegment;

        command.setUndoCommand(new DeleteSegmentCommand(newSegment.id));

        await addSegment(newSegment);
    });

    onCommand<UpdateSegmentCommand>(
        Cmds.UpdateSegmentCommand,
        async (command) => {
            const segment = await getSegment(command.segmentId);

            if (!segment) {
                logger.warn("Target segment not found");
                return;
            }

            command.setUndoCommand(
                new UpdateSegmentCommand(command.segmentId, segment),
            );

            await updateSegment(command.segmentId, command.updates);
        },
    );

    onCommand<TranscriptionNameChangeCommand>(
        Cmds.TranscriptionNameChangeCommand,
        async (command) => {
            command.setUndoCommand(
                new TranscriptionNameChangeCommand(
                    command.transcriptionId,
                    command.newName,
                    command.oldName,
                ),
            );

            updateTranscription(command.transcriptionId, {
                name: command.newName,
            });
        },
    );

    onCommand<RenameSpeakerCommand>(
        Cmds.RenameSpeakerCommand,
        async (command) => {
            await db.segments
                .where("transcriptionId")
                .equals(command.transcriptionId)
                .and((segment) => segment.speaker === command.oldName)
                .modify({ speaker: command.newName });

            await db.transcriptions
                .where("id")
                .equals(command.transcriptionId)
                .modify({ updatedAt: new Date() });
        },
    );

    onCommand<RestoreSegmentCommand>(
        Cmds.RestoreSegmentCommand,
        async (command) => {
            await putSegment(command.segmentData);
        },
    );
};
