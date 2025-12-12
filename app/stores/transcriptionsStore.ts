import { defineStore } from "pinia";
import { v4 as uuidv4 } from "uuid";
import { initDB } from "~/services/indexDbService";
import { SummaryResponseSchema, type SummaryResponse } from "~/types/summarizeResponse";
import type { StoredTranscription } from "../types/storedTranscription";
import { isApiError } from "@dcc-bs/communication.bs.js";

// Database configuration
const STORE_NAME = "transcriptions";
// Define retention period (30 days in milliseconds)
export const TRANSCRIPTION_RETENTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Store to manage transcriptions with IndexedDB persistence
 */
export const useTranscriptionsStore = defineStore("transcriptions", () => {
    // State
    const transcriptions = ref<StoredTranscription[]>([]);
    const currentTranscription = ref<StoredTranscription | undefined>(
        undefined,
    );
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const db = ref<IDBDatabase | null>(null);
    const isSummaryGenerating = ref(false);
    const { apiFetch } = useApi();

    const logger = useLogger();

    /**
     * Initialize the IndexedDB database
     */
    async function initializeDB(): Promise<void> {
        try {
            db.value = await initDB();
            isLoading.value = false;
            await loadAllTranscriptions();
        } catch (e: unknown) {
            if (e instanceof Error) {
                logger.error(e.message);
            } else {
                logger.error("Unknown error initializing database", e);
            }

            isLoading.value = false;
        }
    }

    /**
     * Load all transcriptions from IndexedDB
     * Note: This doesn't load audio blobs by default to save memory
     */
    async function loadAllTranscriptions(): Promise<StoredTranscription[]> {
        if (!db.value) await initializeDB();

        return new Promise<StoredTranscription[]>((resolve, reject) => {
            if (!db.value) {
                error.value = "Database not initialized";
                reject(new Error(error.value));
                return;
            }

            isLoading.value = true;

            const transaction = db.value.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                // Store transcriptions but remove the audio blobs to save memory
                transcriptions.value = request.result.map((transcription) => {
                    // Create a copy without the audioFile blob
                    const { mediaFile: _, ...restOfTranscription } =
                        transcription;
                    return restOfTranscription;
                });
                isLoading.value = false;
                resolve(transcriptions.value);
            };

            request.onerror = (event) => {
                error.value = `Failed to load transcriptions: ${(event.target as IDBRequest).error?.message}`;
                isLoading.value = false;
                reject(new Error(error.value));
            };
        });
    }

    /**
     * Clean up transcriptions older than the retention period (30 days)
     * @returns The number of transcriptions deleted
     */
    async function cleanupOldTranscriptions(): Promise<number> {
        if (!db.value) await initializeDB();

        const localDb = db.value;
        if (!localDb) {
            logger.error("Database not initialized for cleanup.");
            return 0;
        }

        return new Promise((resolve, reject) => {
            const transaction = localDb.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);

            let index: IDBIndex;
            try {
                index = store.index("createdAt");
            } catch (e: unknown) {
                logger.error(
                    "createdAt index missing on transcriptions store.",
                    e,
                );
                if (e instanceof Error) {
                    reject(e);
                } else {
                    reject(
                        new Error(
                            "Failed to access createdAt index during cleanup.",
                        ),
                    );
                }
                return;
            }

            const thresholdDate = new Date(
                Date.now() - TRANSCRIPTION_RETENTION_PERIOD_MS,
            );
            // Iterate via the createdAt index to avoid loading the entire dataset
            const range = IDBKeyRange.upperBound(thresholdDate);
            let deletedCount = 0;

            const request = index.openKeyCursor(range);

            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    const deleteRequest = store.delete(cursor.primaryKey);

                    deleteRequest.onerror = () => {
                        logger.error(
                            `Failed to delete transcription ${String(cursor.primaryKey)} during cleanup:`,
                            deleteRequest.error,
                        );
                    };

                    deletedCount++;
                    cursor.continue();
                    return;
                }

                if (deletedCount > 0) {
                    logger.info(
                        `Cleaned up ${deletedCount} transcriptions older than 30 days`,
                    );
                }
                resolve(deletedCount);
            };

            request.onerror = () => {
                logger.error(
                    "Failed to iterate over transcription index during cleanup:",
                    request.error,
                );
                reject(request.error);
            };

            transaction.onerror = () => {
                logger.error(
                    "Transaction error during transcription cleanup:",
                    transaction.error,
                );
                reject(transaction.error);
            };
        });
    }

    /**
     * Get a single transcription by ID
     * @param id The transcription ID
     * @param includeAudio Whether to include the audio blob (default: false)
     */
    async function getTranscription(
        id: string,
        includeAudio = false,
    ): Promise<StoredTranscription | null> {
        if (!db.value) await initializeDB();

        return new Promise((resolve, reject) => {
            if (!db.value) {
                error.value = "Database not initialized";
                reject(new Error(error.value));
                return;
            }

            const transaction = db.value.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                if (!request.result) {
                    resolve(null);
                    return;
                }

                // If includeAudio is false, remove the audio blob to save memory
                if (!includeAudio && request.result.audioFile) {
                    const { mediaFile: _, ...transcriptionWithoutAudio } =
                        request.result;
                    resolve(transcriptionWithoutAudio);
                } else {
                    resolve(request.result);
                }
            };

            request.onerror = (event) => {
                error.value = `Failed to get transcription: ${(event.target as IDBRequest).error?.message}`;
                reject(new Error(error.value));
            };
        });
    }

    /**
     * Get only the audio file blob for a transcription
     */
    async function getAudioFile(id: string): Promise<Blob | null> {
        if (!db.value) await initializeDB();

        return new Promise((resolve, reject) => {
            if (!db.value) {
                error.value = "Database not initialized";
                reject(new Error(error.value));
                return;
            }

            const transaction = db.value.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                if (!request.result?.audioFile) {
                    resolve(null);
                    return;
                }
                resolve(request.result.audioFile);
            };

            request.onerror = (event) => {
                error.value = `Failed to get audio file: ${(event.target as IDBRequest).error?.message}`;
                reject(new Error(error.value));
            };
        });
    }

    /**
     * Add a new transcription to the store with optional audio file
     */
    async function addTranscription(
        transcription: Omit<
            StoredTranscription,
            "id" | "createdAt" | "updatedAt"
        >,
        audioFile?: File | Blob,
        audioFileName?: string,
    ): Promise<StoredTranscription> {
        if (!db.value) await initializeDB();

        // Create a new transcription with ID and timestamps
        const now = new Date();
        const newTranscription: StoredTranscription = {
            ...transcription,
            id: uuidv4(), // Generate unique ID
            // Use provided name if available, otherwise use mediaFileName or default
            name:
                transcription.name ||
                audioFileName ||
                `Transcription ${now.toLocaleString()}`,
            createdAt: now,
            updatedAt: now,
        };

        // Add audio file if provided
        if (audioFile) {
            newTranscription.mediaFile = audioFile;
            newTranscription.mediaFileName = audioFileName ?? "audio-file";

            // If name wasn't explicitly set and we have a mediaFileName, use that
            if (!transcription.name && audioFileName) {
                newTranscription.name = audioFileName;
            }

            // Generate a unique audioFileId
            newTranscription.audioFileId = uuidv4();
        }

        return new Promise((resolve, reject) => {
            if (!db.value) {
                error.value = "Database not initialized";
                reject(new Error(error.value));
                return;
            }

            const transaction = db.value.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(newTranscription);

            request.onsuccess = () => {
                // Add to local state, but without the audio blob
                const { mediaFile: _, ...transcriptionWithoutAudio } =
                    newTranscription;
                transcriptions.value.push(transcriptionWithoutAudio);
                resolve(newTranscription);
            };

            request.onerror = (event) => {
                error.value = `Failed to add transcription: ${(event.target as IDBRequest).error?.message}`;
                reject(new Error(error.value));
            };
        });
    }

    /**
     * Set the current transcription by ID
     */
    async function setCurrentTranscription(id: string): Promise<void> {
        const transcription = await getTranscription(id, true);
        if (!transcription) {
            throw new Error(`Transcription with ID ${id} not found`);
        }

        currentTranscription.value = transcription;
    }

    /**
     * Update the current transcription
     */
    async function updateCurrentTranscription(
        updates: Partial<
            Omit<StoredTranscription, "id" | "createdAt" | "updatedAt">
        >,
    ): Promise<void> {
        if (!currentTranscription.value) {
            throw new Error("No current transcription set");
        }

        const newTranscription = await updateTranscription(
            currentTranscription.value.id,
            updates,
        );
        currentTranscription.value = newTranscription;
    }

    /**
     * Update an existing transcription
     */
    async function updateTranscription(
        id: string,
        updates: Partial<
            Omit<StoredTranscription, "id" | "createdAt" | "updatedAt">
        >,
        audioFile?: File | Blob,
        audioFileName?: string,
    ): Promise<StoredTranscription> {
        if (!db.value) await initializeDB();

        // First get the existing transcription with audio
        const existingTranscription = await getTranscription(id, true);

        if (!existingTranscription) {
            error.value = `Transcription with ID ${id} not found`;
            throw new Error(error.value);
        }

        // Create a new Promise with non-async executor function
        return new Promise((resolve, reject) => {
            if (!db.value) {
                error.value = "Database not initialized";
                reject(new Error(error.value));
                return;
            }

            const clonedTranscription = JSON.parse(
                JSON.stringify(existingTranscription),
            ) as StoredTranscription;

            // Update the transcription with new data and update timestamp
            const updatedTranscription: StoredTranscription = {
                ...clonedTranscription,
                // Only apply updates for properties that exist in the updates object
                ...(updates.segments
                    ? { segments: JSON.parse(JSON.stringify(updates.segments)) }
                    : {}),
                ...(updates.mediaFileName
                    ? { mediaFileName: updates.mediaFileName }
                    : {}),
                ...(updates.audioFileId
                    ? { audioFileId: updates.audioFileId }
                    : {}),
                ...(updates.name ? { name: updates.name } : {}), // Apply name updates if present
                ...(updates.summary !== undefined
                    ? { summary: updates.summary }
                    : {}), // Apply summary updates if present
                updatedAt: new Date(),
            };

            // Update audio file if provided
            if (audioFile) {
                updatedTranscription.mediaFile = audioFile;
                updatedTranscription.mediaFileName =
                    audioFileName ?? "audio-file";

                // If updating audio and name wasn't provided in updates, update name to match new audio filename
                if (
                    !updates.name &&
                    audioFileName &&
                    !clonedTranscription.name
                ) {
                    updatedTranscription.name = audioFileName;
                }

                // Generate a new audioFileId if one doesn't already exist
                if (!updatedTranscription.audioFileId) {
                    updatedTranscription.audioFileId = uuidv4();
                }
            } else if (existingTranscription.mediaFile) {
                // Keep the existing media file if present
                updatedTranscription.mediaFile =
                    existingTranscription.mediaFile;
            }

            // Validate data before writing to IndexedDB
            // Ensure segments array is serializable
            if (updatedTranscription.segments) {
                // Check if segments is actually an array
                if (!Array.isArray(updatedTranscription.segments)) {
                    logger.error(
                        "Segments is not an array:",
                        updatedTranscription.segments,
                    );
                    reject(new Error("Segments must be an array"));
                    return;
                }
            }

            const transaction = db.value.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(updatedTranscription);

            request.onsuccess = () => {
                // Update local state, but without the audio blob
                const { mediaFile: _, ...transcriptionWithoutAudio } =
                    updatedTranscription;

                const index = transcriptions.value.findIndex(
                    (t) => t.id === id,
                );
                if (index !== -1) {
                    transcriptions.value[index] = transcriptionWithoutAudio;
                }

                resolve(updatedTranscription);
            };

            request.onerror = (event) => {
                error.value = `Failed to update transcription: ${(event.target as IDBRequest).error?.message}`;
                reject(new Error(error.value));
            };
        });
    }

    /**
     * Delete a transcription
     */
    async function deleteTranscription(id: string): Promise<void> {
        if (!db.value) await initializeDB();

        return new Promise((resolve, reject) => {
            if (!db.value) {
                error.value = "Database not initialized";
                reject(new Error(error.value));
                return;
            }

            const transaction = db.value.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                // Update local state
                transcriptions.value = transcriptions.value.filter(
                    (t) => t.id !== id,
                );
                resolve();
            };

            request.onerror = (event) => {
                error.value = `Failed to delete transcription: ${(event.target as IDBRequest).error?.message}`;
                reject(new Error(error.value));
            };
        });
    }

    /**
     * Get the complete text from all segments
     */
    function getTranscriptionText(transcription: StoredTranscription): string {
        // Helper method to extract text from segments
        return transcription.segments.map((segment) => segment.text).join(" ");
    }

    /**
     * Helper function to validate and sanitize transcript text
     */
    function validateAndSanitizeTranscriptText(text: string): string {
        if (!text || typeof text !== "string") {
            throw new Error(
                "Transcript text is required and must be a string.",
            );
        }

        // Trim whitespace
        const trimmedText = text.trim();

        if (trimmedText.length === 0) {
            throw new Error("Transcript text cannot be empty.");
        }

        // Check minimum length (at least 10 characters for meaningful content)
        const MIN_LENGTH = 10;
        if (trimmedText.length < MIN_LENGTH) {
            throw new Error(
                `Transcript text must be at least ${MIN_LENGTH} characters long.`,
            );
        }

        // Check maximum length to prevent oversized requests
        const MAX_LENGTH = 32000 * 4;
        if (trimmedText.length > MAX_LENGTH) {
            throw new Error(
                `Transcript text is too large. Maximum allowed length is ${MAX_LENGTH} characters.`,
            );
        }

        return trimmedText;
    }

    // Computed properties (getters)

    /**
     * Get transcription count
     */
    const transcriptionCount = computed(() => {
        return transcriptions.value.length;
    });

    /**
     * Get transcriptions with audio files
     */
    const transcriptionsWithAudio = computed(() => {
        return transcriptions.value.filter((t) => t.audioFileId);
    });

    /**
     * Filter transcriptions by search query
     */
    function searchTranscriptions(query: string): StoredTranscription[] {
        const lowerQuery = query.toLowerCase();
        return transcriptions.value.filter((transcription) => {
            // Search through all segment texts
            const fullText = transcription.segments
                .map((segment) => segment.text)
                .join(" ")
                .toLowerCase();

            return fullText.includes(lowerQuery);
        });
    }

    /**
     * Generate and store a summary for the current transcription
     */
    async function generateSummary(): Promise<string | null> {
        if (!currentTranscription.value) {
            throw new Error(
                "No current transcription available for summary generation.",
            );
        }

        // Prevent concurrent calls
        if (isSummaryGenerating.value) {
            throw new Error(
                "Summary generation is already in progress for this transcription.",
            );
        }

        const isRegeneration = !!currentTranscription.value.summary;

        try {
            isSummaryGenerating.value = true;

            // If regenerating, clear the existing summary immediately
            if (isRegeneration) {
                currentTranscription.value = {
                    ...currentTranscription.value,
                    summary: undefined,
                };
            }

            const transcriptText = getTranscriptionText(
                currentTranscription.value,
            );

            // Validate and sanitize transcript text
            const sanitizedText =
                validateAndSanitizeTranscriptText(transcriptText);

            const formData = new FormData();
            formData.append("transcript", sanitizedText);

            const summaryResponse = await apiFetch(
                "/api/summarize/submit",
                {
                    schema: SummaryResponseSchema,
                    method: "POST",
                    body: formData,
                },
            );

            if (isApiError(summaryResponse)) {
                throw summaryResponse;
            }

            const summary = summaryResponse.summary;

            // Store the summary in the current transcription with proper reactivity
            currentTranscription.value = {
                ...currentTranscription.value,
                summary: summary,
            };

            // Update the transcription in IndexedDB
            await updateCurrentTranscription({
                summary: summary,
            });

            return summary;
        } catch (error) {
            logger.error("Failed to generate summary:", error);
            throw error;
        } finally {
            isSummaryGenerating.value = false;
        }
    }

    // Initialize the store when it's first accessed
    onMounted(() => {
        async function bootstrapStore(): Promise<void> {
            try {
                // Initialize the database before running maintenance tasks
                await initializeDB();
                // Perform cleanup separately to avoid coupling it to initialization
                await cleanupOldTranscriptions();
            } catch (e: unknown) {
                if (e instanceof Error) {
                    logger.error(e.message);
                } else {
                    logger.error("Failed to bootstrap transcription store", e);
                }
            }
        }

        void bootstrapStore();
    });

    return {
        // State
        transcriptions,
        currentTranscription,
        isLoading,
        error,
        isSummaryGenerating,

        // Actions
        initializeDB,
        loadAllTranscriptions,
        getTranscription,
        getAudioFile,
        addTranscription,
        setCurrentTranscription,
        updateCurrentTranscription,
        updateTranscription,
        deleteTranscription,
        getTranscriptionText,
        generateSummary,

        // Getters
        transcriptionCount,
        transcriptionsWithAudio,
        searchTranscriptions,

        // Maintenance
        cleanupOldTranscriptions,
    };
});
