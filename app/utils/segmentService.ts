import { v4 as uuid } from "uuid";
import { db } from "~/stores/db";
import {
    type StoredSegment,
    StoredSegmentSchema,
} from "~/types/storedSegments";

export function getSegmentService() {
    async function getSegment(id: string): Promise<StoredSegment | undefined> {
        return db.segments.where("id").equals(id).first();
    }

    async function updateTranscriptionUpdatedAt(transcriptionId: string) {
        await db.transcriptions
            .where("id")
            .equals(transcriptionId)
            .modify({ updatedAt: new Date() });
    }

    async function addSegments(segments: Omit<StoredSegment, "id">[]) {
        const newSegments = segments.map((segment) =>
            StoredSegmentSchema.parse({
                ...segment,
                id: uuid(),
            } as StoredSegment),
        );

        await db.segments.bulkAdd(newSegments);

        return newSegments;
    }

    async function addSegment(segment: Omit<StoredSegment, "id">) {
        const newSegment = StoredSegmentSchema.parse({
            ...segment,
            id: uuid(),
        });

        await db.segments.add(newSegment);
        await updateTranscriptionUpdatedAt(newSegment.transcriptionId);

        return newSegment;
    }

    async function putSegment(segment: StoredSegment) {
        const segmentParsed = StoredSegmentSchema.parse(segment);

        await db.segments.put(segmentParsed);
        await updateTranscriptionUpdatedAt(segmentParsed.transcriptionId);
    }

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
        updateSegment,
        deleteSegment,
    };
}
