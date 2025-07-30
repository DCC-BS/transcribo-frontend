// Database configuration
const DB_NAME = "transcribo-db";
const TRANSCIPTION_STORE_NAME = "transcriptions";
const TASK_STORE_NAME = "tasks";
const DB_VERSION = 2; // Updated version for summary field addition

/**
 * Database migration history:
 * - v1: Initial schema with transcriptions and tasks stores
 * - v2: Added 'summary' field to transcription records for AI-generated meeting summaries
 */

/**
 * Get the current database version
 */
export async function getCurrentDBVersion(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME);

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const version = db.version;
            db.close();
            resolve(version);
        };

        request.onerror = () => {
            reject(new Error("Failed to get database version"));
        };
    });
}

/**
 * Initialize the IndexedDB database with migration support
 */
export async function initDB() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        let migrationInfo: { oldVersion: number; newVersion: number } | null =
            null;

        // Open database connection
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Handle database upgrade (first time or version change)
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const oldVersion = event.oldVersion;
            const newVersion = event.newVersion || DB_VERSION;

            console.log(
                `Upgrading database schema from version ${oldVersion} to ${newVersion}`,
            );

            // Store migration info for data migrations after connection
            migrationInfo = { oldVersion, newVersion };

            // Only perform schema changes here (creating stores and indexes)
            createTaskStore(db);
            createTranscriptionStore(db);
        };

        // Handle successful connection
        request.onsuccess = async (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            try {
                // Run data migrations after schema is established
                if (migrationInfo && migrationInfo.oldVersion > 0) {
                    await runDataMigrations(
                        db,
                        migrationInfo.oldVersion,
                        migrationInfo.newVersion,
                    );
                }
                resolve(db);
            } catch (error) {
                db.close();
                reject(error);
            }
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
            keyPath: "id",
        });
        store.createIndex("status", "status", {
            unique: false,
        });
        store.createIndex("mediaFileId", "mediaFileId", {
            unique: false,
        });
    }
}

function createTaskStore(db: IDBDatabase) {
    // Create object store for tasks if it doesn't exist
    if (!db.objectStoreNames.contains(TASK_STORE_NAME)) {
        const store = db.createObjectStore(TASK_STORE_NAME, {
            keyPath: "id",
        });
        store.createIndex("status", "status", {
            unique: false,
        });
        store.createIndex("mediaFileId", "mediaFileId", {
            unique: false,
        });
    }
}

/**
 * Run data migrations based on version changes
 */
async function runDataMigrations(
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number,
): Promise<void> {
    console.log(
        `Running data migrations from version ${oldVersion} to ${newVersion}`,
    );

    // Migration from version 1 to version 2: Add summary field
    if (oldVersion < 2 && newVersion >= 2) {
        await migrateDataToV2(db);
    }

    // Future migrations can be added here
    // if (oldVersion < 3 && newVersion >= 3) {
    //     await migrateDataToV3(db);
    // }
}

/**
 * Data migration from v1 to v2: Add summary field to transcriptions
 */
async function migrateDataToV2(db: IDBDatabase): Promise<void> {
    console.log(
        "Running data migration to v2: Adding summary field to transcriptions",
    );

    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
            [TRANSCIPTION_STORE_NAME],
            "readwrite",
        );
        const store = transaction.objectStore(TRANSCIPTION_STORE_NAME);
        const request = store.openCursor();

        let processed = 0;
        let updated = 0;

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;

            if (cursor) {
                const transcription = cursor.value;
                processed++;

                // Only update if summary field doesn't exist
                if (!Object.hasOwn(transcription, "summary")) {
                    transcription.summary = undefined;

                    const updateRequest = cursor.update(transcription);

                    updateRequest.onsuccess = () => {
                        updated++;
                        cursor.continue();
                    };

                    updateRequest.onerror = () => {
                        console.error(
                            "Failed to update transcription during migration:",
                            updateRequest.error,
                        );
                        reject(
                            new Error(
                                `Migration failed: ${updateRequest.error?.message}`,
                            ),
                        );
                    };
                } else {
                    // Record already has summary field, just continue
                    cursor.continue();
                }
            } else {
                // No more records
                console.log(
                    `Migration to v2 completed: ${updated} records updated out of ${processed} processed`,
                );
                resolve();
            }
        };

        request.onerror = () => {
            console.error(
                "Failed to open cursor for migration:",
                request.error,
            );
            reject(new Error(`Migration failed: ${request.error?.message}`));
        };

        transaction.onerror = () => {
            console.error(
                "Transaction failed during migration:",
                transaction.error,
            );
            reject(
                new Error(
                    `Migration transaction failed: ${transaction.error?.message}`,
                ),
            );
        };
    });
}
