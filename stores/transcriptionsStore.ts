import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { SegementWithId } from '../types/transcriptionResponse';

// Define the structure of a stored transcription
export interface StoredTranscription {
    id: string;
    segments: SegementWithId[]; // Using Segment[] instead of text
    // title removed as it's not needed
    createdAt: Date;
    updatedAt: Date;
    audioFileId?: string;
    audioFile?: Blob;
    audioFileName?: string;
    audioDuration?: number;
}

// Database configuration
const DB_NAME = 'transcribo-db';
const STORE_NAME = 'transcriptions';
const DB_VERSION = 1;

/**
 * Store to manage transcriptions with IndexedDB persistence
 */
export const useTranscriptionsStore = defineStore('transcriptions', {
    state: () => ({
        transcriptions: [] as StoredTranscription[],
        currentTranscription: undefined as StoredTranscription | undefined,
        isLoading: false,
        error: null as string | null,
        db: null as IDBDatabase | null,
    }),

    actions: {
        /**
         * Initialize the IndexedDB database
         */
        async initDB() {
            return new Promise<void>((resolve, reject) => {
                if (this.db) {
                    resolve();
                    return;
                }

                this.isLoading = true;

                // Open database connection
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                // Handle database upgrade (first time or version change)
                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;

                    // Create object store for transcriptions if it doesn't exist
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, {
                            keyPath: 'id',
                        });

                        // Create indexes for faster queries
                        store.createIndex('createdAt', 'createdAt', {
                            unique: false,
                        });
                        store.createIndex('updatedAt', 'updatedAt', {
                            unique: false,
                        });
                        store.createIndex('audioFileId', 'audioFileId', {
                            unique: false,
                        });
                        // Add index for audio file name
                        store.createIndex('audioFileName', 'audioFileName', {
                            unique: false,
                        });
                    }
                };

                // Handle successful connection
                request.onsuccess = (event) => {
                    this.db = (event.target as IDBOpenDBRequest).result;
                    this.isLoading = false;
                    this.loadAllTranscriptions();
                    resolve();
                };

                // Handle errors
                request.onerror = (event) => {
                    this.error = `Database error: ${(event.target as IDBOpenDBRequest).error?.message}`;
                    this.isLoading = false;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Load all transcriptions from IndexedDB
         * Note: This doesn't load audio blobs by default to save memory
         */
        async loadAllTranscriptions() {
            if (!this.db) await this.initDB();

            return new Promise<StoredTranscription[]>((resolve, reject) => {
                // Updated return type
                this.isLoading = true;

                const transaction = this.db!.transaction(
                    STORE_NAME,
                    'readonly',
                );
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => {
                    // Store transcriptions but remove the audio blobs to save memory
                    this.transcriptions = request.result.map(
                        (transcription) => {
                            // Create a copy without the audioFile blob
                            const { audioFile, ...restOfTranscription } =
                                transcription;
                            return restOfTranscription;
                        },
                    );
                    this.isLoading = false;
                    resolve(this.transcriptions);
                };

                request.onerror = (event) => {
                    this.error = `Failed to load transcriptions: ${(event.target as IDBRequest).error?.message}`;
                    this.isLoading = false;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Get a single transcription by ID
         * @param id The transcription ID
         * @param includeAudio Whether to include the audio blob (default: false)
         */
        async getTranscription(
            id: string,
            includeAudio: boolean = false,
        ): Promise<StoredTranscription | null> {
            // Updated return type
            if (!this.db) await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction(
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
                    this.error = `Failed to get transcription: ${(event.target as IDBRequest).error?.message}`;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Get only the audio file blob for a transcription
         */
        async getAudioFile(id: string): Promise<Blob | null> {
            if (!this.db) await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction(
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
                    this.error = `Failed to get audio file: ${(event.target as IDBRequest).error?.message}`;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Add a new transcription to the store with optional audio file
         */
        async addTranscriptions(
            transcription: Omit<
                StoredTranscription,
                'id' | 'createdAt' | 'updatedAt'
            >, // Updated type
            audioFile?: File | Blob,
            audioFileName?: string,
        ): Promise<StoredTranscription> {
            // Updated return type
            if (!this.db) await this.initDB();

            // Create a new transcription with ID and timestamps
            const now = new Date();
            const newTranscription: StoredTranscription = {
                ...transcription,
                id: uuidv4(), // Generate unique ID
                createdAt: now,
                updatedAt: now,
            };

            // Add audio file if provided
            if (audioFile) {
                newTranscription.audioFile = audioFile;
                newTranscription.audioFileName = audioFileName ?? 'audio-file';

                // Generate a unique audioFileId
                newTranscription.audioFileId = uuidv4();

                // Get audio duration if it's a File and has audio metadata
                if (
                    audioFile instanceof File &&
                    audioFile.type.startsWith('audio/')
                ) {
                    try {
                        const audioDuration =
                            await this.getAudioDuration(audioFile);
                        newTranscription.audioDuration = audioDuration;
                    } catch (error) {
                        console.warn('Could not get audio duration:', error);
                    }
                }
            }

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction(
                    STORE_NAME,
                    'readwrite',
                );
                const store = transaction.objectStore(STORE_NAME);
                const request = store.add(newTranscription);

                request.onsuccess = () => {
                    // Add to local state, but without the audio blob
                    const { audioFile, ...transcriptionWithoutAudio } =
                        newTranscription;
                    this.transcriptions.push(transcriptionWithoutAudio);
                    resolve(newTranscription);
                };

                request.onerror = (event) => {
                    this.error = `Failed to add transcription: ${(event.target as IDBRequest).error?.message}`;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Get audio duration from a file
         */
        async getAudioDuration(file: File | Blob): Promise<number> {
            return new Promise((resolve, reject) => {
                // Create a temporary URL for the blob
                const url = URL.createObjectURL(file);
                const audio = new Audio();

                audio.addEventListener('loadedmetadata', () => {
                    // Get duration in seconds
                    resolve(audio.duration);
                    // Clean up
                    URL.revokeObjectURL(url);
                });

                audio.addEventListener('error', (err) => {
                    URL.revokeObjectURL(url);
                    reject(err);
                });

                audio.src = url;
            });
        },

        async setCurrentTranscription(id: string): Promise<void> {
            const transcription = await this.getTranscription(id, true);
            if (!transcription) {
                throw new Error(`Transcription with ID ${id} not found`);
            }

            this.currentTranscription = transcription;
        },

        async updateCurrentTrascription(
            updates: Partial<
                Omit<StoredTranscription, 'id' | 'createdAt' | 'updatedAt'>
            >,
        ): Promise<void> {
            if (!this.currentTranscription) {
                throw new Error('No current transcription set');
            }

            const newTranscription = await this.updateTranscriptions(
                this.currentTranscription.id,
                updates,
            );
            this.currentTranscription = newTranscription;
        },

        /**
         * Update an existing transcription
         */
        async updateTranscriptions(
            id: string,
            updates: Partial<
                Omit<StoredTranscription, 'id' | 'createdAt' | 'updatedAt'>
            >, // Updated type
            audioFile?: File | Blob,
            audioFileName?: string,
        ): Promise<StoredTranscription> {
            // Updated return type
            if (!this.db) await this.initDB();

            // First get the existing transcription with audio
            const existingTranscription = await this.getTranscription(id, true);

            if (!existingTranscription) {
                this.error = `Transcription with ID ${id} not found`;
                throw new Error(this.error);
            }

            // Create a new Promise with non-async executor function
            return new Promise((resolve, reject) => {
                // Update the transcription with new data and update timestamp
                const updatedTranscription: StoredTranscription = {
                    ...existingTranscription,
                    ...updates,
                    updatedAt: new Date(),
                };

                // Update audio file if provided
                if (audioFile) {
                    updatedTranscription.audioFile = audioFile;
                    updatedTranscription.audioFileName =
                        audioFileName ?? 'audio-file';

                    // Generate a new audioFileId if one doesn't already exist
                    if (!updatedTranscription.audioFileId) {
                        updatedTranscription.audioFileId = uuidv4();
                    }

                    // Get audio duration if it's a File and has audio metadata
                    if (
                        audioFile instanceof File &&
                        audioFile.type.startsWith('audio/')
                    ) {
                        // Use Promise.catch() rather than try/catch with an unawaited promise
                        this.getAudioDuration(audioFile)
                            .then((audioDuration) => {
                                updatedTranscription.audioDuration =
                                    audioDuration;
                            })
                            .catch((error) => {
                                console.warn(
                                    'Could not get audio duration:',
                                    error,
                                );
                            });
                    }
                }

                const transaction = this.db!.transaction(
                    STORE_NAME,
                    'readwrite',
                );
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(updatedTranscription);

                request.onsuccess = () => {
                    // Update local state, but without the audio blob
                    const { audioFile, ...transcriptionWithoutAudio } =
                        updatedTranscription;

                    const index = this.transcriptions.findIndex(
                        (t) => t.id === id,
                    );
                    if (index !== -1) {
                        this.transcriptions[index] = transcriptionWithoutAudio;
                    }

                    resolve(updatedTranscription);
                };

                request.onerror = (event) => {
                    this.error = `Failed to update transcription: ${(event.target as IDBRequest).error?.message}`;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Delete a transcription
         */
        async deleteTranscription(id: string): Promise<void> {
            if (!this.db) await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction(
                    STORE_NAME,
                    'readwrite',
                );
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(id);

                request.onsuccess = () => {
                    // Update local state
                    this.transcriptions = this.transcriptions.filter(
                        (t) => t.id !== id,
                    );
                    resolve();
                };

                request.onerror = (event) => {
                    this.error = `Failed to delete transcription: ${(event.target as IDBRequest).error?.message}`;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Get the complete text from all segments
         */
        getTranscriptionText(transcription: StoredTranscription): string {
            // Helper method to extract text from segments
            return transcription.segments
                .map((segment) => segment.text)
                .join(' ');
        },
    },

    getters: {
        /**
         * Get transcription count
         */
        transcriptionCount: (state) => {
            return state.transcriptions.length;
        },

        /**
         * Filter transcriptions by search query
         */
        searchTranscriptions: (state) => (query: string) => {
            const lowerQuery = query.toLowerCase();
            return state.transcriptions.filter((transcription) => {
                // Search through all segment texts
                const fullText = transcription.segments
                    .map((segment) => segment.text)
                    .join(' ')
                    .toLowerCase();

                return fullText.includes(lowerQuery);
            });
        },

        /**
         * Get transcriptions with audio files
         */
        transcriptionsWithAudio: (state) => {
            return state.transcriptions.filter((t) => t.audioFileId);
        },
    },
});
