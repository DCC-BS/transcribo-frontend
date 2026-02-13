import type { StoredTranscription } from "~/types/storedTranscription";
import { db } from "~/stores/db";
import { v4 as uuidv4 } from "uuid";


export const TRANSCRIPTION_RETENTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function useTranscription() {


    function getTranscriptions(): Promise<StoredTranscription[]> {
        return db.transcriptions.toArray()
    }

    function getTranscription(id: string): Promise<StoredTranscription | undefined> {
        return db.transcriptions.where("id").equals(id).first();
    }

    async function addTranscription(
        transcription: Omit<StoredTranscription, "id" | "createdAt" | "updatedAt">
    ) {
        const now = new Date();

        const newTranscription: StoredTranscription = {
            ...transcription,
            id: uuidv4(),
            name: transcription.name ?? transcription.mediaFileName ?? `Transcription ${now.toLocaleDateString()}`,
            createdAt: now,
            updatedAt: now
        };

        await db.transcriptions.add(newTranscription);

        return newTranscription;
    }

    async function updateTranscription(id: string, updates: Partial<StoredTranscription>) {
        await db.transcriptions.update(id, updates);
    }

    async function deleteTranscription(id: string) {
        await db.transcriptions.delete(id);
    }

    async function cleanupOldTranscriptions(): Promise<number> {
        const thresholdDate = new Date(Date.now() - TRANSCRIPTION_RETENTION_PERIOD_MS);

        return await db.transcriptions
            .where("createdAt")
            .below(thresholdDate)
            .delete();
    }

    return {
        getTranscriptions,
        getTranscription,
        addTranscription,
        updateTranscription,
        deleteTranscription,
        cleanupOldTranscriptions
    }
}
