import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { SegementWithId } from '../types/transcriptionResponse';
import { initDB } from '~/services/indexDbService';

// Define the structure of a stored transcription
export interface StoredTranscription {
    id: string;
    segments: SegementWithId[]; // Using Segment[] instead of text
    name: string; // Added name property for the transcription
    createdAt: Date;
    updatedAt: Date;
    audioFileId?: string;
    mediaFile?: Blob;
    mediaFileName?: string;
}

// Database configuration
const STORE_NAME = 'transcriptions';

/**
 * Store to manage transcriptions with IndexedDB persistence
 */
export const useTranscriptionsStore = defineStore('transcriptions', () => {
    // State
    const transcriptions = ref<StoredTranscription[]>([]);
    const currentTranscription = ref<StoredTranscription | undefined>(undefined);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const db = ref<IDBDatabase | null>(null);

    const logger = useLogger();

    /**
     * Initialize the IndexedDB database
     */
    async function initializeDB(): Promise<void> {
        try {
            db.value = await initDB();
            isLoading.value = false;
            await loadAllTranscriptions();
        }
        catch (e: unknown) {
            if (e instanceof Error) {
                logger.error(e.message);
            } else {
                logger.error('Unknown error initializing database', e);
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
            isLoading.value = true;

            const transaction = db.value!.transaction(
                STORE_NAME,
                'readonly',
            );
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                // Store transcriptions but remove the audio blobs to save memory
                transcriptions.value = request.result.map(
                    (transcription) => {
                        // Create a copy without the audioFile blob
                        const { audioFile, ...restOfTranscription } =
                            transcription;
                        return restOfTranscription;
                    },
                );
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
     * Get a single transcription by ID
     * @param id The transcription ID
     * @param includeAudio Whether to include the audio blob (default: false)
     */
    async function getTranscription(
        id: string,
        includeAudio: boolean = false,
    ): Promise<StoredTranscription | null> {
        if (!db.value) await initializeDB();

        return new Promise((resolve, reject) => {
            const transaction = db.value!.transaction(
                STORE_NAME,
                'readonly',
            );
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                if (!request.result) {
                    resolve(null);
                    return;
                }

                // If includeAudio is false, remove the audio blob to save memory
                if (!includeAudio && request.result.audioFile) {
                    const { audioFile, ...transcriptionWithoutAudio } =
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
            const transaction = db.value!.transaction(
                STORE_NAME,
                'readonly',
            );
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
            'id' | 'createdAt' | 'updatedAt'
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
            name: transcription.name || audioFileName || `Transcription ${now.toLocaleString()}`,
            createdAt: now,
            updatedAt: now,
        };

        // Add audio file if provided
        if (audioFile) {
            newTranscription.mediaFile = audioFile;
            newTranscription.mediaFileName = audioFileName ?? 'audio-file';

            // If name wasn't explicitly set and we have a mediaFileName, use that
            if (!transcription.name && audioFileName) {
                newTranscription.name = audioFileName;
            }

            // Generate a unique audioFileId
            newTranscription.audioFileId = uuidv4();
        }

        return new Promise((resolve, reject) => {
            const transaction = db.value!.transaction(
                STORE_NAME,
                'readwrite',
            );
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(newTranscription);

            request.onsuccess = () => {
                // Add to local state, but without the audio blob
                const { mediaFile: audioFile, ...transcriptionWithoutAudio } =
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
            Omit<StoredTranscription, 'id' | 'createdAt' | 'updatedAt'>
        >,
    ): Promise<void> {
        if (!currentTranscription.value) {
            throw new Error('No current transcription set');
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
            Omit<StoredTranscription, 'id' | 'createdAt' | 'updatedAt'>
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
            const clonedTranscription = JSON.parse(JSON.stringify(existingTranscription)) as StoredTranscription;

            // Update the transcription with new data and update timestamp
            const updatedTranscription: StoredTranscription = {
                ...clonedTranscription,
                // Only apply updates for properties that exist in the updates object
                ...(updates.segments ? { segments: JSON.parse(JSON.stringify(updates.segments)) } : {}),
                ...(updates.mediaFileName ? { mediaFileName: updates.mediaFileName } : {}),
                ...(updates.audioFileId ? { audioFileId: updates.audioFileId } : {}),
                ...(updates.name ? { name: updates.name } : {}), // Apply name updates if present
                updatedAt: new Date(),
            };

            // Update audio file if provided
            if (audioFile) {
                updatedTranscription.mediaFile = audioFile;
                updatedTranscription.mediaFileName =
                    audioFileName ?? 'audio-file';

                // If updating audio and name wasn't provided in updates, update name to match new audio filename
                if (!updates.name && audioFileName && !clonedTranscription.name) {
                    updatedTranscription.name = audioFileName;
                }

                // Generate a new audioFileId if one doesn't already exist
                if (!updatedTranscription.audioFileId) {
                    updatedTranscription.audioFileId = uuidv4();
                }
            } else if (existingTranscription.mediaFile) {
                // Keep the existing media file if present
                updatedTranscription.mediaFile = existingTranscription.mediaFile;
            }

            // Validate data before writing to IndexedDB
            // Ensure segments array is serializable
            if (updatedTranscription.segments) {
                // Check if segments is actually an array
                if (!Array.isArray(updatedTranscription.segments)) {
                    logger.error('Segments is not an array:', updatedTranscription.segments);
                    reject(new Error('Segments must be an array'));
                    return;
                }
            }

            const transaction = db.value!.transaction(
                STORE_NAME,
                'readwrite',
            );
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(updatedTranscription);

            request.onsuccess = () => {
                // Update local state, but without the audio blob
                const { mediaFile: audioFile, ...transcriptionWithoutAudio } =
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
            const transaction = db.value!.transaction(
                STORE_NAME,
                'readwrite',
            );
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
        return transcription.segments
            .map((segment) => segment.text)
            .join(' ');
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
                .join(' ')
                .toLowerCase();

            return fullText.includes(lowerQuery);
        });
    }

    // Initialize the store when it's first accessed
    onMounted(() => {
        initializeDB();
    });

    return {
        // State
        transcriptions,
        currentTranscription,
        isLoading,
        error,

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

        // Getters
        transcriptionCount,
        transcriptionsWithAudio,
        searchTranscriptions,
    };
});
