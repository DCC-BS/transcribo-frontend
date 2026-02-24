import { v4 as uuidv4 } from "uuid";
import { db } from "~/stores/db";
import {
    type StoredTranscription,
    StoredTranscriptionSchema,
} from "~/types/storedTranscription";

export const TRANSCRIPTION_RETENTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function useTranscription() {
    function getTranscriptions(): Promise<StoredTranscription[]> {
        return db.transcriptions.toArray();
    }

    function getTranscription(
        id: string,
    ): Promise<StoredTranscription | undefined> {
        return db.transcriptions.where("id").equals(id).first();
    }

    async function addTranscription(
        transcription: Omit<
            StoredTranscription,
            "id" | "createdAt" | "updatedAt"
        >,
    ) {
        const now = new Date();

        const newTranscription = StoredTranscriptionSchema.parse({
            ...transcription,
            id: uuidv4(),
            name:
                transcription.name ??
                transcription.mediaFileName ??
                `Transcription ${now.toLocaleDateString()}`,
            createdAt: now,
            updatedAt: now,
        } as StoredTranscription);

        await db.transcriptions.add(newTranscription);

        return newTranscription;
    }

    async function updateTranscription(
        id: string,
        updates: Partial<StoredTranscription>,
    ) {
        const updatesParsed = StoredTranscriptionSchema.partial().parse({
            ...updates,
        });
        await db.transcriptions.update(id, updatesParsed);
    }

    async function deleteTranscription(id: string) {
        await db.transcriptions.delete(id);
    }

    async function cleanupOldTranscriptions(): Promise<number> {
        const thresholdDate = new Date(
            Date.now() - TRANSCRIPTION_RETENTION_PERIOD_MS,
        );

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
        cleanupOldTranscriptions,
    };
}
