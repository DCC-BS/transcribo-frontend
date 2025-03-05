import { defineStore } from 'pinia';
import type { TaskStatus } from '~/types/task';
import { initDB } from '~/services/indexDbService';

// Define the structure of a stored task
export interface StoredTask {
    id: string;
    status: TaskStatus;
    mediaFile?: Blob;
    mediaFileName?: string;
    createdAt?: number; // Timestamp when task was created
}

// Database configuration
const STORE_NAME = 'tasks';
// Define retention period (1 day in milliseconds)
const RETENTION_PERIOD_MS = 24 * 60 * 60 * 1000;

export const useTasksStore = defineStore("tasksStore", {
    state: () => ({
        tasks: [] as StoredTask[],
        isLoading: false,
        error: null as string | null,
        db: null as IDBDatabase | null,
    }),

    actions: {
        /**
         * Initialize the IndexedDB database for tasks
         */
        async initDB() {
            try {
                this.db = await initDB();
                this.isLoading = false;
                this.loadAllTasks();
                this.cleanupOldTasks();
            }
            catch (e: unknown) {
                if (e instanceof Error) {
                    console.error(e.message);
                } else {
                    console.error('Unknown error initializing database', e);
                }

                this.isLoading = false;
            }
        },

        /**
         * Load all tasks from IndexedDB
         * Note: This doesn't load media blobs by default to save memory
         */
        async loadAllTasks() {
            if (!this.db) await this.initDB();

            return new Promise<StoredTask[]>((resolve, reject) => {
                this.isLoading = true;

                const transaction = this.db!.transaction(
                    STORE_NAME,
                    'readonly',
                );
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => {
                    // Store tasks but remove the media blobs to save memory
                    this.tasks = request.result.map(
                        (task) => {
                            // Create a copy without the mediaFile blob
                            const { mediaFile, ...restOfTask } = task;
                            return restOfTask;
                        },
                    );
                    this.isLoading = false;
                    resolve(this.tasks);
                };

                request.onerror = (event) => {
                    this.error = `Failed to load tasks: ${(event.target as IDBRequest).error?.message}`;
                    this.isLoading = false;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Get a single task by ID
         * @param id The task ID
         * @param includeMedia Whether to include the media blob (default: false)
         */
        async getTask(
            id: string,
        ): Promise<StoredTask | null> {
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

                    resolve(request.result);
                };

                request.onerror = (event) => {
                    this.error = `Failed to get task: ${(event.target as IDBRequest).error?.message}`;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Add a new task to the store with optional media file
         */
        async addTask(
            status: TaskStatus,
            mediaFile?: File | Blob,
            mediaFileName?: string,
        ): Promise<StoredTask> {
            if (!this.db) await this.initDB();

            // Create a new task with ID and timestamps
            const newTask: StoredTask = {
                id: status.task_id,
                status,
                createdAt: Date.now(), // Add creation timestamp
            };

            // Add media file if provided
            if (mediaFile) {
                newTask.mediaFile = mediaFile;
                newTask.mediaFileName = mediaFileName ?? 'media-file';
            }

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction(
                    STORE_NAME,
                    'readwrite',
                );
                const store = transaction.objectStore(STORE_NAME);
                const request = store.add(newTask);

                request.onsuccess = () => {
                    // Add to local state, but without the media blob
                    const { mediaFile, ...taskWithoutMedia } = newTask;
                    this.tasks.push(taskWithoutMedia);
                    resolve(newTask);
                };

                request.onerror = (event) => {
                    this.error = `Failed to add task: ${(event.target as IDBRequest).error?.message}`;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Update an existing task
         */
        async updateTask(
            id: string,
            updates: Partial<Omit<StoredTask, 'id' | 'createdAt' | 'updatedAt'>>,
            mediaFile?: File | Blob,
            mediaFileName?: string,
        ): Promise<StoredTask> {
            if (!this.db) await this.initDB();

            // First get the existing task with media
            const existingTask = await this.getTask(id);

            if (!existingTask) {
                this.error = `Task with ID ${id} not found`;
                throw new Error(this.error);
            }

            return new Promise((resolve, reject) => {
                // Create a deep clone of the existing task
                const clonedTask = JSON.parse(JSON.stringify(existingTask)) as StoredTask;

                // Update the task with new data and update timestamp
                const updatedTask: StoredTask = {
                    ...clonedTask,
                    ...(updates.status !== undefined ? { status: updates.status } : {}),
                    ...(updates.mediaFileName ? { mediaFileName: updates.mediaFileName } : {}),
                };

                // Update media file if provided
                if (mediaFile) {
                    updatedTask.mediaFile = mediaFile;
                    updatedTask.mediaFileName = mediaFileName ?? 'media-file';
                } else if (existingTask.mediaFile) {
                    // Keep the existing media file if present
                    updatedTask.mediaFile = existingTask.mediaFile;
                }

                const transaction = this.db!.transaction(
                    STORE_NAME,
                    'readwrite',
                );
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(updatedTask);

                request.onsuccess = () => {
                    // Update local state, but without the media blob
                    const { mediaFile, ...taskWithoutMedia } = updatedTask;

                    const index = this.tasks.findIndex(
                        (t) => t.id === id,
                    );
                    if (index !== -1) {
                        this.tasks[index] = taskWithoutMedia;
                    }

                    resolve(updatedTask);
                };

                request.onerror = (event) => {
                    this.error = `Failed to update task: ${(event.target as IDBRequest).error?.message}`;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Delete a task
         */
        async deleteTask(id: string): Promise<void> {
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
                    this.tasks = this.tasks.filter(
                        (t) => t.id !== id,
                    );
                    resolve();
                };

                request.onerror = (event) => {
                    this.error = `Failed to delete task: ${(event.target as IDBRequest).error?.message}`;
                    reject(new Error(this.error));
                };
            });
        },

        /**
         * Clean up tasks older than the retention period (1 day)
         * @returns The number of tasks deleted
         */
        async cleanupOldTasks(): Promise<number> {
            if (!this.db) await this.initDB();

            // Get all tasks including their creation timestamps
            const tasks = await this.loadAllTasks();
            const now = Date.now();
            let deletedCount = 0;

            // Find tasks older than the retention period
            const oldTaskIds = tasks
                .filter(task => task.createdAt && (now - task.createdAt > RETENTION_PERIOD_MS))
                .map(task => task.id);

            // Delete each old task
            for (const taskId of oldTaskIds) {
                try {
                    await this.deleteTask(taskId);
                    deletedCount++;
                } catch (error) {
                    console.error(`Failed to delete old task ${taskId}:`, error);
                }
            }

            console.log(`Cleaned up ${deletedCount} tasks older than 1 day`);
            return deletedCount;
        },
    },
});
