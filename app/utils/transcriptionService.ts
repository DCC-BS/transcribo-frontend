import { v4 as uuidv4 } from "uuid";
import { db } from "~/stores/db";
import {
    type StoredTranscription,
    StoredTranscriptionSchema,
} from "~/types/storedTranscription";

export const TRANSCRIPTION_RETENTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Transcription persistence layer on top of the IndexedDB store.
 *
 * @returns The transcription service operations.
 */
export function getTranscriptionService() {
    /**
     * Lists all stored transcriptions.
     *
     * @returns Every transcription record.
     */
    function getTranscriptions(): Promise<StoredTranscription[]> {
        return db.transcriptions.toArray();
    }

    /**
     * Looks up a single transcription.
     *
     * @param id - Transcription id.
     * @returns The transcription, or `undefined` when it does not exist.
     */
    function getTranscription(
        id: string,
    ): Promise<StoredTranscription | undefined> {
        return db.transcriptions.where("id").equals(id).first();
    }

    /**
     * Creates a transcription, defaulting its name to the media file name or
     * the current date.
     *
     * @param transcription - Fields to store; id and timestamps are generated.
     * @returns The stored transcription.
     */
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

    /**
     * Applies a partial update and refreshes `updatedAt`.
     *
     * @param id - Transcription id.
     * @param updates - Fields to change.
     */
    async function updateTranscription(
        id: string,
        updates: Partial<StoredTranscription>,
    ) {
        const updatesParsed = StoredTranscriptionSchema.partial().parse({
            ...updates,
            updatedAt: new Date(),
        });

        await db.transcriptions.update(id, updatesParsed);
    }

    /**
     * Deletes a transcription together with all of its segments.
     *
     * @param id - Transcription id.
     */
    async function deleteTranscription(id: string) {
        await db.segments.where("transcriptionId").equals(id).delete();
        await db.transcriptions.delete(id);
    }

    /**
     * Deletes transcriptions untouched for longer than the retention period,
     * along with their segments.
     *
     * @returns How many transcriptions were removed.
     */
    async function cleanupOldTranscriptions(): Promise<number> {
        const thresholdDate = new Date(
            Date.now() - TRANSCRIPTION_RETENTION_PERIOD_MS,
        );

        return await db.transaction(
            "rw",
            [db.transcriptions, db.segments],
            async () => {
                await db.transcriptions
                    .where("updatedAt")
                    .below(thresholdDate)
                    .toArray()
                    .then((oldTranscriptions) => {
                        const oldTranscriptionIds = oldTranscriptions.map(
                            (t) => t.id,
                        );

                        return db.segments
                            .where("transcriptionId")
                            .anyOf(oldTranscriptionIds)
                            .delete();
                    });

                return await db.transcriptions
                    .where("updatedAt")
                    .below(thresholdDate)
                    .delete();
            },
        );
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
