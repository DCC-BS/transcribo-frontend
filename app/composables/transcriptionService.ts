import { v4 as uuid } from "uuid";
import type {
    InsertSegementCommand,
    RenameSpeakerCommand,
} from "~/types/commands";
import {
    type AddSegmentCommand,
    Cmds,
    DeleteSegementCommand,
    RestoreSegmentCommand,
    TranscriptonNameChangeCommand,
    UpdateSegementCommand,
} from "~/types/commands";
import type { SegementWithId } from "~/types/transcriptionResponse";

export const useTranscriptionService = (currentTranscriptionId: string) => {
    const store = useTranscriptionsStore();
    const error = ref<string>();
    const isInited = ref(false);
    const logger = useLogger();
    const { registerHandler, unregisterHandler } = useCommandBus();

    store.initializeDB();
    store
        .setCurrentTranscription(currentTranscriptionId)
        .then(() => {
            isInited.value = true;
        })
        .catch((err) => {
            error.value = err;
        });

    async function handleDeleteSegment(command: DeleteSegementCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            logger.warn("Current transcription not found");
            return;
        }

        // Find the segment before deleting it to store its data for undo
        const segmentToDelete = currentTranscription.segments.find(
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
        currentTranscription.segments = currentTranscription.segments.filter(
            (s) => s.id !== command.segmentId,
        );

        store.updateCurrentTranscription({
            segments: currentTranscription.segments,
        });
    }

    async function handleInsertSegment(command: InsertSegementCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            logger.warn("Current transcription not found");
            return;
        }

        const targetIndex = currentTranscription.segments.findIndex(
            (s) => s.id === command.targetSegmentId,
        );
        if (targetIndex === -1) {
            logger.warn("Target segment not found");
            return;
        }

        const targetSegment = currentTranscription.segments[targetIndex];

        if (!targetSegment) {
            logger.warn("Target segment is undefined");
            return;
        }

        const start =
            command.direction === "before"
                ? targetSegment.start - 2
                : targetSegment.end;

        const newSegement = {
            id: uuid(),
            start: start,
            end: start + 2,
            text: "",
            ...command.newSegement,
        } as SegementWithId;

        command.setUndoCommand(new DeleteSegementCommand(newSegement.id));

        currentTranscription.segments.splice(targetIndex, 0, newSegement);

        const newTranscriptions = currentTranscription.segments.toSorted(
            (a, b) => a.start - b.start,
        );
        store.updateCurrentTranscription({ segments: newTranscriptions });
    }

    async function handleAddSegment(command: AddSegmentCommand): Promise<void> {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            logger.warn("Current transcription not found");
            return;
        }

        const newSegement = {
            id: uuid(),
            ...command.newSegement,
        } as SegementWithId;

        command.setUndoCommand(new DeleteSegementCommand(newSegement.id));

        currentTranscription.segments.push(newSegement);

        const newTranscriptions = currentTranscription.segments.toSorted(
            (a, b) => a.start - b.start,
        );
        store.updateCurrentTranscription({ segments: newTranscriptions });
    }

    async function handleUpdateSegment(command: UpdateSegementCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            logger.warn("Current transcription not found");
            return;
        }

        const segment = currentTranscription.segments.find(
            (s) => s.id === command.segmentId,
        );

        if (!segment) {
            logger.warn("Target segment not found");
            return;
        }

        const updatedSegment = { ...segment, ...command.updates };
        command.setUndoCommand(
            new UpdateSegementCommand(command.segmentId, segment),
        );

        const newSegments = currentTranscription.segments
            .map((s) => (s.id === command.segmentId ? updatedSegment : s))
            .sort((a, b) => a.start - b.start);

        store.updateCurrentTranscription({ segments: newSegments });
    }

    async function handleNameChanged(command: TranscriptonNameChangeCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            logger.warn("Current transcription not found");
            return;
        }

        const oldName = currentTranscription.name;
        command.setUndoCommand(new TranscriptonNameChangeCommand(oldName));

        store.updateCurrentTranscription({ name: command.newName });
    }

    async function handleRenameSpeaker(command: RenameSpeakerCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            logger.warn("Current transcription not found");
            return;
        }

        const newSegments = currentTranscription.segments.map((s) =>
            s.speaker === command.oldName
                ? { ...s, speaker: command.newName }
                : s,
        );

        store.updateCurrentTranscription({ segments: newSegments });
    }

    async function handleRestoreSegment(command: RestoreSegmentCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            logger.warn("Current transcription not found");
            return;
        }

        // Add the restored segment back to the segments array
        currentTranscription.segments.push(command.segmentData);

        // Sort segments by start time to maintain proper order
        const newSegments = currentTranscription.segments.toSorted(
            (a, b) => a.start - b.start,
        );

        store.updateCurrentTranscription({ segments: newSegments });
    }

    function registerService() {
        registerHandler(Cmds.DeleteSegementCommand, handleDeleteSegment);
        registerHandler(Cmds.InsertSegementCommand, handleInsertSegment);
        registerHandler(Cmds.UpdateSegementCommand, handleUpdateSegment);
        registerHandler(Cmds.TranscriptonNameChangeCommand, handleNameChanged);
        registerHandler(Cmds.RenameSpeakerCommand, handleRenameSpeaker);
        registerHandler(Cmds.AddSegmentCommand, handleAddSegment);
        registerHandler(Cmds.RestoreSegmentCommand, handleRestoreSegment);
    }

    function unRegisterServer() {
        unregisterHandler(Cmds.DeleteSegementCommand, handleDeleteSegment);
        unregisterHandler(Cmds.InsertSegementCommand, handleInsertSegment);
        unregisterHandler(Cmds.UpdateSegementCommand, handleUpdateSegment);
        unregisterHandler(
            Cmds.TranscriptonNameChangeCommand,
            handleNameChanged,
        );
        unregisterHandler(Cmds.RenameSpeakerCommand, handleRenameSpeaker);
        unregisterHandler(Cmds.AddSegmentCommand, handleAddSegment);
        unregisterHandler(Cmds.RestoreSegmentCommand, handleRestoreSegment);
    }

    return { registerService, unRegisterServer, error, isInited };
};
