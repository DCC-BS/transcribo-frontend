import { describe, expect, it } from "vitest";
import {
    SegmentSchema,
    TranscriptCorrectionSchema,
    TranscriptionResponseSchema,
} from "../../app/types/transcriptionResponse";

import {
    type StoredSegment,
    StoredSegmentSchema
} from "../../app/types/storedSegments"

describe("Zod Schemas", () => {
    describe("SegmentSchema", () => {
        it("should validate valid segment object", () => {
            const segment = {
                start: 0,
                end: 5,
                text: "Hello world",
                speaker: "Speaker 1",
            };

            const result = SegmentSchema.safeParse(segment);
            expect(result.success).toBe(true);
        });

        it("should validate segment without speaker", () => {
            const segment = {
                start: 0,
                end: 5,
                text: "Hello world",
            };

            const result = SegmentSchema.safeParse(segment);
            expect(result.success).toBe(true);
        });

        it("should fail for missing required fields", () => {
            const segment = {
                start: 0,
                text: "Hello",
            };

            const result = SegmentSchema.safeParse(segment);
            expect(result.success).toBe(false);
        });
    });

    describe("SegmentWithIdSchema", () => {
        it("should validate segment with id", () => {
            const segment = {
                id: "segment-1",
                start: 0,
                end: 5,
                text: "Hello world",
                speaker: "Speaker 1",
                transcriptionId: "abc"
            };

            const result = StoredSegmentSchema.safeParse(segment);
            expect(result.success).toBe(true);
        });

        it("should fail without id", () => {
            const segment = {
                start: 0,
                end: 5,
                text: "Hello world",
            };

            const result = StoredSegmentSchema.safeParse(segment);
            expect(result.success).toBe(false);
        });
    });

    describe("TranscriptionResponseSchema", () => {
        it("should validate valid transcription response", () => {
            const response = {
                segments: [
                    { start: 0, end: 5, text: "Hello" },
                    { start: 5, end: 10, text: "World" },
                ],
            };

            const result = TranscriptionResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });

        it("should validate empty segments array", () => {
            const response = {
                segments: [],
            };

            const result = TranscriptionResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });

        it("should fail for missing segments", () => {
            const response = {};

            const result = TranscriptionResponseSchema.safeParse(response);
            expect(result.success).toBe(false);
        });

        it("should validate response with applied corrections", () => {
            const response = {
                segments: [{ start: 0, end: 5, text: "Hello" }],
                applied_corrections: [
                    {
                        original: "Jobshipping",
                        corrected: "Dropshipping",
                        reason: "dominant variant",
                        confidence: 0.9,
                    },
                ],
            };

            const result = TranscriptionResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });
    });

    describe("TranscriptCorrectionSchema", () => {
        it("should default a missing reason to an empty string", () => {
            const correction = {
                original: "Zagg",
                corrected: "ZAK",
                confidence: 0.9,
            };

            const result = TranscriptCorrectionSchema.safeParse(correction);
            expect(result.success).toBe(true);
            expect(result.data?.reason).toBe("");
        });

        it("should fail for missing required fields", () => {
            const correction = { original: "Zagg" };

            const result = TranscriptCorrectionSchema.safeParse(correction);
            expect(result.success).toBe(false);
        });
    });
});
