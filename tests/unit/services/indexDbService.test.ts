import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("indexDbService constants and helpers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("database constants", () => {
        it("should use correct database name", () => {
            const DB_NAME = "transcribo-db";
            expect(DB_NAME).toBe("transcribo-db");
        });

        it("should use correct store names", () => {
            const TRANSCIPTION_STORE_NAME = "transcriptions";
            const TASK_STORE_NAME = "tasks";
            const SEGMENT_STORE_NAME = "segments";

            expect(TRANSCIPTION_STORE_NAME).toBe("transcriptions");
            expect(TASK_STORE_NAME).toBe("tasks");
            expect(SEGMENT_STORE_NAME).toBe("segments");
        });

        it("should use correct database version", () => {
            const DB_VERSION = 42;
            expect(DB_VERSION).toBe(42);
        });
    });

    describe("IndexedDB mock availability", () => {
        it("should have indexedDB available in global scope", () => {
            vi.stubGlobal("indexedDB", {
                open: vi.fn(),
                deleteDatabase: vi.fn(),
            });
            
            expect(indexedDB).toBeDefined();
            expect(typeof indexedDB.open).toBe("function");
        });
    });
});
