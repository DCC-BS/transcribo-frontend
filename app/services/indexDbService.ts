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

// Migration types
interface MigrationContext {
    db: IDBDatabase;
    transaction: IDBTransaction;
    oldVersion: number;
    newVersion: number;
}

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
        // Open database connection
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Handle database upgrade (first time or version change)
        request.onupgradeneeded = async (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = (event.target as IDBOpenDBRequest).transaction;
            const oldVersion = event.oldVersion;
            const newVersion = event.newVersion || DB_VERSION;

            if (!transaction) {
                reject(
                    new Error(
                        "Transaction not available during database upgrade",
                    ),
                );
                return;
            }

            console.log(
                `Upgrading database from version ${oldVersion} to ${newVersion}`,
            );

            // Create stores if they don't exist (for new installations)
            createTaskStore(db);
            createTranscriptionStore(db);

            // Run migrations for existing data
            if (oldVersion > 0) {
                await runMigrations({
                    db,
                    transaction,
                    oldVersion,
                    newVersion,
                });
            }
        };

        // Handle successful connection
        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
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
 * Run database migrations based on version changes
 */
async function runMigrations(context: MigrationContext): Promise<void> {
    const { oldVersion, newVersion } = context;

    // Migration from version 1 to version 2: Add summary field
    if (oldVersion < 2 && newVersion >= 2) {
        await migrateToV2(context);
    }

    // Future migrations can be added here
    // if (oldVersion < 3 && newVersion >= 3) {
    //     await migrateToV3(context);
    // }
}

/**
 * Migration from v1 to v2: Add summary field to transcriptions
 */
async function migrateToV2(context: MigrationContext): Promise<void> {
    console.log(
        "Running migration to v2: Adding summary field to transcriptions",
    );

    const { transaction } = context;

    return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(TRANSCIPTION_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const transcriptions = request.result;
            let completed = 0;
            const total = transcriptions.length;

            if (total === 0) {
                console.log("No transcriptions to migrate");
                resolve();
                return;
            }

            console.log(`Migrating ${total} transcription records to v2`);

            transcriptions.forEach((transcription) => {
                // Add summary field if it doesn't exist
                if (!Object.hasOwn(transcription, "summary")) {
                    transcription.summary = undefined;
                }

                const updateRequest = store.put(transcription);

                updateRequest.onsuccess = () => {
                    completed++;
                    if (completed === total) {
                        console.log(
                            `Successfully migrated ${total} transcription records to v2`,
                        );
                        resolve();
                    }
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
            });
        };

        request.onerror = () => {
            console.error(
                "Failed to fetch transcriptions for migration:",
                request.error,
            );
            reject(new Error(`Migration failed: ${request.error?.message}`));
        };
    });
}
