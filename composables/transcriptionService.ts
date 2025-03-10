import { Cmds, DeleteSegementCommand, InsertSegementCommand, RenameSpeakerCommand, TranscriptonNameChangeCommand, UpdateSegementCommand } from "~/types/commands";
import { v4 as uuid } from 'uuid';
import type { SegementWithId } from "~/types/transcriptionResponse";
import { compileAsync } from "sass";

export const useTranscriptionService = (currentTranscriptionId: string) => {
    const store = useTranscriptionsStore();
    const { registerHandler, unregisterHandler } = useCommandBus();

    store.initDB();
    store.setCurrentTranscription(currentTranscriptionId);

    async function handleDeleteSegment(command: DeleteSegementCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            console.warn('Current transcription not found');
            return;
        }

        currentTranscription.segments = currentTranscription.segments
            .filter(s => s.id !== command.segmentId);

        store.updateCurrentTrascription({ segments: currentTranscription.segments });
    }

    async function handleInsertSegment(command: InsertSegementCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            console.warn('Current transcription not found');
            return;
        }

        const targetIndex = currentTranscription.segments.findIndex(s => s.id === command.targetSegmentId);
        if (targetIndex === -1) {
            console.warn('Target segment not found');
            return;
        }

        const targetSegment = currentTranscription.segments[targetIndex];

        const start = command.direction === 'before' ? targetSegment.start - 2 : targetSegment.end;

        const newSegement = {
            id: uuid(),
            start: start,
            end: start + 2,
            text: '',
            ...command.newSegement
        } as SegementWithId;

        command.setUndoCommand(new DeleteSegementCommand(newSegement.id));

        currentTranscription.segments.splice(targetIndex, 0, newSegement);

        const newTranscriptions = currentTranscription.segments
            .toSorted((a, b) => a.start - b.start);
        store.updateCurrentTrascription({ segments: newTranscriptions });

    }

    async function handleUpdateSegment(command: UpdateSegementCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            console.warn('Current transcription not found');
            return;
        }

        const segment = currentTranscription.segments.find(s => s.id === command.segmentId);

        if (!segment) {
            console.warn('Target segment not found');
            return;
        }

        const updatedSegment = { ...segment, ...command.updates };
        command.setUndoCommand(new UpdateSegementCommand(command.segmentId, segment));

        const newSegments = currentTranscription.segments
            .map(s => s.id === command.segmentId ? updatedSegment : s)
            .sort((a, b) => a.start - b.start);

        store.updateCurrentTrascription({ segments: newSegments });
    }

    async function handleNameChanged(command: TranscriptonNameChangeCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            console.warn('Current transcription not found');
            return;
        }

        const oldName = currentTranscription.name;
        command.setUndoCommand(new TranscriptonNameChangeCommand(oldName));

        store.updateCurrentTrascription({ name: command.newName });
    }

    async function handleRenameSpeaker(command: RenameSpeakerCommand) {
        const currentTranscription = store.currentTranscription;

        if (!currentTranscription) {
            console.warn('Current transcription not found');
            return;
        }

        const newSegments = currentTranscription.segments
            .map(s => s.speaker === command.oldName ? { ...s, speaker: command.newName } : s);

        store.updateCurrentTrascription({ segments: newSegments });
    }

    function registerService() {
        registerHandler(Cmds.DeleteSegementCommand, handleDeleteSegment);
        registerHandler(Cmds.InsertSegementCommand, handleInsertSegment);
        registerHandler(Cmds.UpdateSegementCommand, handleUpdateSegment);
        registerHandler(Cmds.TranscriptonNameChangeCommand, handleNameChanged);
        registerHandler(Cmds.RenameSpeakerCommand, handleRenameSpeaker);
    }

    function unRegisterServer() {
        unregisterHandler(Cmds.DeleteSegementCommand, handleDeleteSegment);
        unregisterHandler(Cmds.InsertSegementCommand, handleInsertSegment);
        unregisterHandler(Cmds.UpdateSegementCommand, handleUpdateSegment);
        unregisterHandler(Cmds.TranscriptonNameChangeCommand, handleNameChanged);
        unregisterHandler(Cmds.RenameSpeakerCommand, handleRenameSpeaker);
    }

    return { registerService, unRegisterServer };
}
