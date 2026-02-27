import { describe, expect, it } from "vitest";
import {
    WordSchema,
    SegmentSchema,
    SegmentWithIdSchema,
    TranscriptionResponseSchema,
    VerboseSegmentSchema,
    VerboseTranscriptionResponseSchema,
} from "../../../app/types/transcriptionResponse";

describe("Zod Schemas", () => {
    describe("WordSchema", () => {
        it("should validate valid word object", () => {
            const word = {
                start: 0.5,
                end: 1.5,
                word: "Hello",
                probability: 0.95,
                speaker: "Speaker 1",
            };

            const result = WordSchema.safeParse(word);
            expect(result.success).toBe(true);
        });

        it("should validate word with null speaker", () => {
            const word = {
                start: 0.5,
                end: 1.5,
                word: "Hello",
                probability: 0.95,
                speaker: null,
            };

            const result = WordSchema.safeParse(word);
            expect(result.success).toBe(true);
        });

        it("should fail for missing required fields", () => {
            const word = {
                start: 0.5,
                end: 1.5,
            };

            const result = WordSchema.safeParse(word);
            expect(result.success).toBe(false);
        });

        it("should fail for wrong types", () => {
            const word = {
                start: "0.5",
                end: 1.5,
                word: "Hello",
                probability: 0.95,
                speaker: "Speaker 1",
            };

            const result = WordSchema.safeParse(word);
            expect(result.success).toBe(false);
        });
    });

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
            };

            const result = SegmentWithIdSchema.safeParse(segment);
            expect(result.success).toBe(true);
        });

        it("should fail without id", () => {
            const segment = {
                start: 0,
                end: 5,
                text: "Hello world",
            };

            const result = SegmentWithIdSchema.safeParse(segment);
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
    });

    describe("VerboseSegmentSchema", () => {
        it("should validate valid verbose segment", () => {
            const segment = {
                id: 1,
                seek: 0,
                start: 0,
                end: 5,
                text: "Hello",
                tokens: [1, 2, 3],
                temperature: 0.5,
                avg_logprob: -0.3,
                compression_ratio: 1.5,
                no_speech_prob: 0.01,
                words: [
                    {
                        start: 0,
                        end: 0.5,
                        word: "Hello",
                        probability: 0.95,
                        speaker: null,
                    },
                ],
                speaker: "Speaker 1",
            };

            const result = VerboseSegmentSchema.safeParse(segment);
            expect(result.success).toBe(true);
        });

        it("should validate segment with null words", () => {
            const segment = {
                id: 1,
                seek: 0,
                start: 0,
                end: 5,
                text: "Hello",
                tokens: [],
                temperature: 0.5,
                avg_logprob: -0.3,
                compression_ratio: 1.5,
                no_speech_prob: 0.01,
                words: null,
                speaker: null,
            };

            const result = VerboseSegmentSchema.safeParse(segment);
            expect(result.success).toBe(true);
        });
    });

    describe("VerboseTranscriptionResponseSchema", () => {
        it("should validate valid verbose response", () => {
            const response = {
                task: "transcribe",
                language: "en",
                duration: 60,
                text: "Hello world",
                words: [],
                segments: [],
            };

            const result = VerboseTranscriptionResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });

        it("should fail for missing required fields", () => {
            const response = {
                task: "transcribe",
                language: "en",
            };

            const result = VerboseTranscriptionResponseSchema.safeParse(response);
            expect(result.success).toBe(false);
        });
    });
});
