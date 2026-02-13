import { Dexie, type EntityTable } from 'dexie';
import type { StoredTranscription } from '~/types/storedTranscription';
import type { StoredTask } from '~/types/task';

export const db = new Dexie("transcribo-db") as Dexie & {
    tasks: EntityTable<StoredTask, "id">,
    transcriptions: EntityTable<StoredTranscription, "id">
};

db.version(3).stores({
    tasks: "id, status, mediaFile, mediaFileName, createdAt",
    transcriptions: "id, segments, name, createdAt, updatedAt, audioFiledId, mediaFile, mediaFileName, summary"
});
