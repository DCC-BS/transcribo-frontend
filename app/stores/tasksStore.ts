// import { defineStore } from "pinia";
// import { initDB } from "~/services/indexDbService";
// import type { TaskStatus } from "~/types/task";

// // Define the structure of a stored task
// export interface StoredTask {
//     id: string;
//     status: TaskStatus;
//     mediaFile?: Blob;
//     mediaFileName?: string;
//     createdAt?: number; // Timestamp when task was created
// }

// // Database configuration
// const STORE_NAME = "tasks";
// // Define retention period (1 day in milliseconds)
// const RETENTION_PERIOD_MS = 24 * 60 * 60 * 1000;

// export const useTasksStore = defineStore("tasksStore", () => {
//     const logger = useLogger();

//     // State as refs
//     const tasks = ref<StoredTask[]>([]);
//     const isLoading = ref(false);
//     const error = ref<string | null>(null);
//     const db = ref<IDBDatabase | null>(null);

//     /**
//      * Initialize the IndexedDB database for tasks
//      */
//     async function initializeDB(): Promise<void> {
//         try {
//             db.value = await initDB();
//             isLoading.value = false;
//             await loadAllTasks();
//             await cleanupOldTasks();
//         } catch (e: unknown) {
//             if (e instanceof Error) {
//                 logger.error(e.message);
//             } else {
//                 logger.error(e, "Unknown error initializing database");
//             }

//             isLoading.value = false;
//         }
//     }

//     /**
//      * Load all tasks from IndexedDB
//      * Note: This doesn't load media blobs by default to save memory
//      */
//     async function loadAllTasks(): Promise<StoredTask[]> {
//         if (!db.value) await initializeDB();

//         return new Promise<StoredTask[]>((resolve, reject) => {
//             if (!db.value) {
//                 throw new Error("Database initialization failed");
//             }

//             isLoading.value = true;

//             const transaction = db.value.transaction(STORE_NAME, "readonly");
//             const store = transaction.objectStore(STORE_NAME);
//             const request = store.getAll();

//             request.onsuccess = () => {
//                 // Store tasks but remove the media blobs to save memory
//                 tasks.value = request.result.map((task) => {
//                     // Create a copy without the mediaFile blob
//                     const { mediaFile: _, ...restOfTask } = task;
//                     return restOfTask;
//                 });
//                 isLoading.value = false;
//                 resolve(tasks.value);
//             };

//             request.onerror = (event) => {
//                 error.value = `Failed to load tasks: ${(event.target as IDBRequest).error?.message}`;
//                 isLoading.value = false;
//                 reject(new Error(error.value));
//             };
//         });
//     }

//     /**
//      * Get a single task by ID
//      * @param id The task ID
//      */
//     async function getTask(id: string): Promise<StoredTask | null> {
//         if (!db.value) await initializeDB();

//         return new Promise((resolve, reject) => {
//             if (!db.value) {
//                 throw new Error("Database initialization failed");
//             }

//             const transaction = db.value.transaction(STORE_NAME, "readonly");
//             const store = transaction.objectStore(STORE_NAME);
//             const request = store.get(id);

//             request.onsuccess = () => {
//                 if (!request.result) {
//                     resolve(null);
//                     return;
//                 }RETENTION_PERIOD_MS

//                 resolve(request.result);
//             };

//             request.onerror = (event) => {
//                 error.value = `Failed to get task: ${(event.target as IDBRequest).error?.message}`;
//                 reject(new Error(error.value));
//             };
//         });
//     }

//     /**
//      * Add a new task to the store with optional media file
//      */
//     async function addTask(
//         status: TaskStatus,
//         mediaFile?: File | Blob,
//         mediaFileName?: string,
//     ): Promise<StoredTask> {
//         if (!db.value) await initializeDB();

//         // Create a new task with ID and timestamps
//         const newTask: StoredTask = {
//             id: status.task_id,
//             status,
//             createdAt: Date.now(), // Add creation timestamp
//         };

//         // Add media file if provided
//         if (mediaFile) {
//             newTask.mediaFile = mediaFile;
//             newTask.mediaFileName = mediaFileName ?? "media-file";
//         }

//         return new Promise((resolve, reject) => {
//             if (!db.value) {
//                 throw new Error("Database initialization failed");
//             }

//             const transaction = db.value.transaction(STORE_NAME, "readwrite");
//             const store = transaction.objectStore(STORE_NAME);
//             const request = store.add(newTask);

//             request.onsuccess = () => {
//                 // Add to local state, but without the media blob
//                 const { mediaFile: _, ...taskWithoutMedia } = newTask;
//                 tasks.value.push(taskWithoutMedia);
//                 resolve(newTask);
//             };

//             request.onerror = (event) => {
//                 error.value = `Failed to add task: ${(event.target as IDBRequest).error?.message}`;
//                 reject(new Error(error.value));
//             };
//         });
//     }

//     /**
//      * Update an existing task
//      */
//     async function updateTask(
//         id: string,
//         updates: Partial<Omit<StoredTask, "id" | "createdAt" | "updatedAt">>,
//         mediaFile?: File | Blob,
//         mediaFileName?: string,
//     ): Promise<StoredTask> {
//         if (!db.value) await initializeDB();

//         // First get the existing task with media
//         const existingTask = await getTask(id);

//         if (!existingTask) {
//             error.value = `Task with ID ${id} not found`;
//             throw new Error(error.value);
//         }

//         return new Promise((resolve, reject) => {
//             if (!db.value) {
//                 throw new Error("Database initialization failed");
//             }

//             // Create a deep clone of the existing task
//             const clonedTask = JSON.parse(
//                 JSON.stringify(existingTask),
//             ) as StoredTask;

//             // Update the task with new data and update timestamp
//             const updatedTask: StoredTask = {
//                 ...clonedTask,
//                 ...(updates.status !== undefined
//                     ? { status: updates.status }
//                     : {}),RETENTION_PERIOD_MS
//                 ...(updates.mediaFileName
//                     ? { mediaFileName: updates.mediaFileName }
//                     : {}),
//             };

//             if (mediaFile) {
//                 // Update media file if provided
//                 updatedTask.mediaFile = mediaFile;
//                 updatedTask.mediaFileName = mediaFileName ?? "media-file";
//             } else if (existingTask.mediaFile) {
//                 // Keep the existing media file if present
//                 updatedTask.mediaFile = existingTask.mediaFile;
//             }

//             const transaction = db.value.transaction(STORE_NAME, "readwrite");
//             const store = transaction.objectStore(STORE_NAME);
//             const request = store.put(updatedTask);

//             request.onsuccess = () => {
//                 // Update local state, but without the media blob
//                 const { mediaFile: _, ...taskWithoutMedia } = updatedTask;

//                 const index = tasks.value.findIndex((t) => t.id === id);
//                 if (index !== -1) {
//                     tasks.value[index] = taskWithoutMedia;
//                 }

//                 resolve(updatedTask);
//             };

//             request.onerror = (event) => {
//                 error.value = `Failed to update task: ${(event.target as IDBRequest).error?.message}`;
//                 reject(new Error(error.value));
//             };
//         });
//     }

//     /**
//      * Delete a task
//      */
//     async function deleteTask(id: string): Promise<void> {
//         if (!db.value) await initializeDB();

//         return new Promise((resolve, reject) => {
//             if (!db.value) {
//                 throw new Error("Database initialization failed");
//             }

//             const transaction = db.value.transaction(STORE_NAME, "readwrite");
//             const store = transaction.objectStore(STORE_NAME);
//             const request = store.delete(id);

//             request.onsuccess = () => {
//                 // Update local state
//                 tasks.value = tasks.value.filter((t) => t.id !== id);
//                 resolve();
//             };

//             request.onerror = (event) => {
//                 error.value = `Failed to delete task: ${(event.target as IDBRequest).error?.message}`;
//                 reject(new Error(error.value));
//             };
//         });
//     }

//     /**
//      * Clean up tasks older than the retention period (1 day)
//      * @returns The number of tasks deleted
//      */
//     async function cleanupOldTasks(): Promise<number> {
//         if (!db.value) await initializeDB();

//         // Get all tasks including their creation timestamps
//         const allTasks = await loadAllTasks();
//         const now = Date.now();
//         let deletedCount = 0;

//         // Find tasks older than the retention period
//         const oldTaskIds = allTasks
//             .filter(
//                 (task) =>
//                     task.createdAt &&
//                     now - task.createdAt > RETENTION_PERIOD_MS,
//             )
//             .map((task) => task.id);

//         // Delete each old task
//         for (const taskId of oldTaskIds) {
//             try {
//                 await deleteTask(taskId);
//                 deletedCount++;
//             } catch (error) {
//                 logger.error(error, `Failed to delete old task ${taskId}:`);
//             }
//         }

//         logger.info(`Cleaned up ${deletedCount} tasks older than 1 day`);
//         return deletedCount;
//     }

//     return {
//         // State
//         tasks,
//         isLoading,
//         error,
//         db,

//         // Actions
//         initDB: initializeDB,
//         loadAllTasks,
//         getTask,
//         addTask,
//         updateTask,
//         deleteTask,
//         cleanupOldTasks,
//     };
// });
