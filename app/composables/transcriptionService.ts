import { v4 as uuid } from "uuid";
import type {
    InsertSegmentCommand,
    RenameSpeakerCommand,
} from "~/types/commands";
import {
    type AddSegmentCommand,
    Cmds,
    DeleteSegmentCommand,
    RestoreSegmentCommand,
    TranscriptionNameChangeCommand,
    UpdateSegmentCommand,
} from "~/types/commands";
import type { StoredTranscription } from "~/types/storedTranscription";
import type { SegmentWithId } from "~/types/transcriptionResponse";

export const useTranscriptionService = (transcription: Ref<StoredTranscription | undefined>) => {
    const logger = useLogger();
    const { registerHandler, unregisterHandler } = useCommandBus();
    const { updateTranscription } = useTranscription();

    async function handleDeleteSegment(command: DeleteSegmentCommand) {
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
            segments: transcription.value.segments,
        });
    }

    async function handleInsertSegment(command: InsertSegmentCommand) {
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

        const newTranscriptions = transcription.value.segments.toSorted(
            (a, b) => a.start - b.start,
        );

        await updateTranscription(transcription.value.id, { segments: newTranscriptions });
    }

    async function handleAddSegment(command: AddSegmentCommand): Promise<void> {
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

        const newTranscriptions = transcription.value.segments.toSorted(
            (a, b) => a.start - b.start,
        );

        await updateTranscription(transcription.value.id, { segments: newTranscriptions })
    }

    async function handleUpdateSegment(command: UpdateSegmentCommand) {
        if (!transcription.value) {
            logger.warn("Current transcription not found");
            return;
        }

        const segment = transcription.value.segments.find(
            (s) => s.id === command.segmentId,
        );

        if (!segment) {
            logger.warn("Target segment not found");
            return;
        }

        const updatedSegment = { ...segment, ...command.updates };
        command.setUndoCommand(
            new UpdateSegmentCommand(command.segmentId, segment),
        );

        const newSegments = transcription.value.segments
            .map((s) => (s.id === command.segmentId ? updatedSegment : s))
            .sort((a, b) => a.start - b.start);

        await updateTranscription(transcription.value.id, { segments: newSegments });
    }

    async function handleNameChanged(command: TranscriptionNameChangeCommand) {
        if (!transcription.value) {
            logger.warn("Current transcription not found");
            return;
        }

        const oldName = transcription.value.name;
        command.setUndoCommand(new TranscriptionNameChangeCommand(oldName));

        updateTranscription(transcription.value.id, { name: command.newName });
    }

    async function handleRenameSpeaker(command: RenameSpeakerCommand) {
        if (!transcription.value) {
            logger.warn("Current transcription not found");
            return;
        }

        const newSegments = transcription.value.segments.map((s) =>
            s.speaker === command.oldName
                ? { ...s, speaker: command.newName }
                : s,
        );

        updateTranscription(transcription.value.id, { segments: newSegments });
    }

    async function handleRestoreSegment(command: RestoreSegmentCommand) {
        if (!transcription.value) {
            logger.warn("Current transcription not found");
            return;
        }

        // Add the restored segment back to the segments array
        transcription.value.segments.push(command.segmentData);

        // Sort segments by start time to maintain proper order
        const newSegments = transcription.value.segments.toSorted(
            (a, b) => a.start - b.start,
        );

        updateTranscription(transcription.value.id, { segments: newSegments });
    }

    onMounted(() => {
        registerHandler(Cmds.DeleteSegmentCommand, handleDeleteSegment);
        registerHandler(Cmds.InsertSegmentCommand, handleInsertSegment);
        registerHandler(Cmds.UpdateSegmentCommand, handleUpdateSegment);
        registerHandler(Cmds.TranscriptionNameChangeCommand, handleNameChanged);
        registerHandler(Cmds.RenameSpeakerCommand, handleRenameSpeaker);
        registerHandler(Cmds.AddSegmentCommand, handleAddSegment);
        registerHandler(Cmds.RestoreSegmentCommand, handleRestoreSegment);
    });

    onUnmounted(() => {
        unregisterHandler(Cmds.DeleteSegmentCommand, handleDeleteSegment);
        unregisterHandler(Cmds.InsertSegmentCommand, handleInsertSegment);
        unregisterHandler(Cmds.UpdateSegmentCommand, handleUpdateSegment);
        unregisterHandler(
            Cmds.TranscriptionNameChangeCommand,
            handleNameChanged,
        );
        unregisterHandler(Cmds.RenameSpeakerCommand, handleRenameSpeaker);
        unregisterHandler(Cmds.AddSegmentCommand, handleAddSegment);
        unregisterHandler(Cmds.RestoreSegmentCommand, handleRestoreSegment);
    });
};
