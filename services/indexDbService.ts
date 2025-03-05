// Database configuration
const DB_NAME = 'transcribo-db';
const TRANSCIPTION_STORE_NAME = 'transcriptions';
const TASK_STORE_NAME = 'tasks';
const DB_VERSION = 1;


export async function initDB() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        // Open database connection
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Handle database upgrade (first time or version change)
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            createTaskStore(db);
            createTranscriptionStore(db);
        };

        // Handle successful connection
        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result)
        };

        // Handle errors
        request.onerror = (event) => {
            const error = `Database error: ${(event.target as IDBOpenDBRequest).error?.message}`;
            reject(new Error(error));
        };
    });
}

function createTranscriptionStore(db: IDBDatabase) {
    // Create object store for tasks if it doesn't exist
    if (!db.objectStoreNames.contains(TRANSCIPTION_STORE_NAME)) {
        const store = db.createObjectStore(TRANSCIPTION_STORE_NAME, {
            keyPath: 'id',
        });
        store.createIndex('status', 'status', {
            unique: false,
        });
        store.createIndex('mediaFileId', 'mediaFileId', {
            unique: false,
        });
    }
}

function createTaskStore(db: IDBDatabase) {
    // Create object store for tasks if it doesn't exist
    if (!db.objectStoreNames.contains(TASK_STORE_NAME)) {
        const store = db.createObjectStore(TASK_STORE_NAME, {
            keyPath: 'id',
        });
        store.createIndex('status', 'status', {
            unique: false,
        });
        store.createIndex('mediaFileId', 'mediaFileId', {
            unique: false,
        });
    }
}