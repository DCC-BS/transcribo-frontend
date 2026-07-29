import { v4 as uuid } from "uuid";
import { db } from "~/stores/db";
import {
    type StoredSegment,
    StoredSegmentSchema,
} from "~/types/storedSegments";
import type { Segment } from "~/types/transcriptionResponse";

/**
 * Validates segments against the storage schema before they hit the database.
 *
 * @param segments - Segments to validate.
 * @returns The parsed segment records.
 */
function toStoredSegmentRecords(
    segments: readonly StoredSegment[],
): StoredSegment[] {
    return segments.map((segment) => StoredSegmentSchema.parse(segment));
}

/**
 * Segment persistence layer on top of the IndexedDB store. Every mutation
 * also refreshes the owning transcription's `updatedAt` timestamp.
 *
 * @returns The segment service operations.
 */
export function getSegmentService() {
    /**
     * Looks up a single segment.
     *
     * @param id - Segment id.
     * @returns The segment, or `undefined` when it does not exist.
     */
    async function getSegment(id: string): Promise<StoredSegment | undefined> {
        return db.segments.where("id").equals(id).first();
    }

    /**
     * Marks a transcription as modified now.
     *
     * @param transcriptionId - Transcription to touch.
     */
    async function updateTranscriptionUpdatedAt(transcriptionId: string) {
        await db.transcriptions
            .where("id")
            .equals(transcriptionId)
            .modify({ updatedAt: new Date() });
    }

    /**
     * Bulk-inserts new segments during transcription creation.
     *
     * @param segments - Segments without ids; ids are generated here.
     * @returns The stored segments including their generated ids.
     */
    async function addSegments(segments: Omit<StoredSegment, "id">[]) {
        const newSegments = segments.map((segment) =>
            StoredSegmentSchema.parse({
                ...segment,
                id: uuid(),
            } as StoredSegment),
        );

        await db.segments.bulkAdd(newSegments);
        // this operation is only called on transcription creation
        // therefore I do not update the updatedAt property here

        return newSegments;
    }

    /**
     * Inserts a single new segment.
     *
     * @param segment - Segment without an id; the id is generated here.
     * @returns The stored segment including its generated id.
     */
    async function addSegment(segment: Omit<StoredSegment, "id">) {
        const newSegment = StoredSegmentSchema.parse({
            ...segment,
            id: uuid(),
        });

        await db.segments.add(newSegment);
        await updateTranscriptionUpdatedAt(newSegment.transcriptionId);

        return newSegment;
    }

    /**
     * Writes a segment, inserting or replacing it.
     *
     * @param segment - The segment to store.
     */
    async function putSegment(segment: StoredSegment) {
        const segmentParsed = StoredSegmentSchema.parse(segment);

        await db.segments.put(segmentParsed);
        await updateTranscriptionUpdatedAt(segmentParsed.transcriptionId);
    }

    /**
     * Writes several segments in one transaction.
     *
     * @param segments - The segments to store.
     */
    async function putSegments(segments: readonly StoredSegment[]) {
        const parsedSegments = toStoredSegmentRecords(segments);
        await db.transaction("rw", db.segments, db.transcriptions, async () => {
            await db.segments.bulkPut(parsedSegments);
            const transcriptionIds = new Set(
                parsedSegments.map((segment) => segment.transcriptionId),
            );
            for (const transcriptionId of transcriptionIds) {
                await updateTranscriptionUpdatedAt(transcriptionId);
            }
        });
    }

    /**
     * Applies a partial update to one segment.
     *
     * @param id - Segment id.
     * @param updates - Fields to change.
     * @returns The updated segment, or `undefined` when it does not exist.
     */
    async function updateSegment(id: string, updates: Partial<StoredSegment>) {
        const updatesParsed = StoredSegmentSchema.partial().parse({
            ...updates,
        });

        await db.segments.update(id, updatesParsed);
        const newSegment = await getSegment(id);

        if (newSegment) {
            await updateTranscriptionUpdatedAt(newSegment.transcriptionId);
        }

        return newSegment;
    }

    /**
     * Applies partial updates to several segments in one transaction.
     *
     * @param entries - Segment ids paired with the fields to change.
     * @returns The segments as they were before the update, so the caller can
     * undo.
     */
    async function updateSegments(
        entries: { segmentId: string; updates: Partial<Segment> }[],
    ): Promise<StoredSegment[]> {
        return db.transaction(
            "rw",
            db.segments,
            db.transcriptions,
            async () => {
                const existing = await db.segments.bulkGet(
                    entries.map((entry) => entry.segmentId),
                );
                const previous: StoredSegment[] = [];
                const updated: StoredSegment[] = [];
                for (const [index, entry] of entries.entries()) {
                    const segment = existing[index];
                    if (!segment) {
                        continue;
                    }
                    previous.push(segment);
                    updated.push(
                        StoredSegmentSchema.parse({
                            ...segment,
                            ...entry.updates,
                        }),
                    );
                }
                await db.segments.bulkPut(updated);
                const transcriptionIds = new Set(
                    updated.map((segment) => segment.transcriptionId),
                );
                for (const transcriptionId of transcriptionIds) {
                    await db.transcriptions.update(transcriptionId, {
                        updatedAt: new Date(),
                    });
                }
                return previous;
            },
        );
    }

    /** Removes several segments and returns them, so the caller can undo. */
    async function deleteSegments(ids: string[]): Promise<StoredSegment[]> {
        return db.transaction(
            "rw",
            db.segments,
            db.transcriptions,
            async () => {
                const segments = (await db.segments.bulkGet(ids)).filter(
                    (segment): segment is StoredSegment => !!segment,
                );
                if (segments.length === 0) {
                    return segments;
                }
                await db.segments.bulkDelete(ids);
                const transcriptionIds = new Set(
                    segments.map((segment) => segment.transcriptionId),
                );
                for (const transcriptionId of transcriptionIds) {
                    await updateTranscriptionUpdatedAt(transcriptionId);
                }
                return segments;
            },
        );
    }

    /**
     * Removes a single segment.
     *
     * @param id - Segment id.
     */
    async function deleteSegment(id: string) {
        const segment = await getSegment(id);
        await db.segments.delete(id);

        if (segment) {
            await updateTranscriptionUpdatedAt(segment.transcriptionId);
        }
    }

    return {
        getSegment,
        addSegments,
        addSegment,
        putSegment,
        putSegments,
        updateSegment,
        updateSegments,
        deleteSegment,
        deleteSegments,
    };
}
