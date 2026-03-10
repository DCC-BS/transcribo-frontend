import { Dexie, type EntityTable } from "dexie";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTask } from "~/types/storedTasks";
import type { StoredTranscription } from "~/types/storedTranscription";

import type { StoredTranscription as StoredTranscription4 } from "./migrations/v4/storedTranscription";

export const db = new Dexie("transcribo-db") as Dexie & {
    tasks: EntityTable<StoredTask, "id">;
    transcriptions: EntityTable<StoredTranscription, "id">;
    segments: EntityTable<StoredSegment, "id">;
};

db.version(3).stores({
    tasks: "id, status, createdAt",
    transcriptions: "id, segments, name, createdAt, updatedAt, audioFiledId",
});

db.version(42)
    .stores({
        tasks: "id, status, createdAt",
        transcriptions: "id, name, createdAt, updatedAt, audioFiledId",
        segments: "id, transcriptionId, speaker, start, end",
    })
    .upgrade(async (tx) => {
        let newTx = tx;

        const transcriptions = await tx
            .table<StoredTranscription4>("transcriptions")
            .toArray();

        // try to fix updatedAt field if it's not a Date object
        await tx
            .table("transcriptions")
            .toCollection()
            .modify((t) => {
                if (typeof t.updatedAt === "number") {
                    t.updatedAt = new Date(t.updatedAt);
                } else if (typeof t.updatedAt === "string") {
                    const parsedDate = new Date(t.updatedAt);
                    if (!isNaN(parsedDate.getTime())) {
                        t.updatedAt = parsedDate;
                    }
                }
            });

        for (const t of transcriptions) {
            newTx = await tx.table("segments").bulkAdd(
                t.segments.map(
                    (segment) =>
                        ({
                            ...segment,
                            transcriptionId: t.id,
                        }) as StoredSegment,
                ),
            );
        }

        return newTx;
    });
