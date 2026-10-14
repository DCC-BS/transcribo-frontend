import { describe, expect, it } from "vitest";
import {
    canUploadAsIs,
    MAX_PASSTHROUGH_BITRATE,
} from "../../../app/utils/audioUpload";

const HOUR = 3600;

/** A file whose size matches `bitrate` over `seconds`; content is irrelevant. */
function audioFile(name: string, type: string, bitrate: number, seconds = HOUR) {
    const file = new File([""], name, { type });
    Object.defineProperty(file, "size", { value: (bitrate / 8) * seconds });
    return file;
}

describe("canUploadAsIs", () => {
    it("keeps compact mp3 and ogg untouched", () => {
        expect(canUploadAsIs(audioFile("a.mp3", "audio/mpeg", 64_000), HOUR)).toBe(true);
        expect(canUploadAsIs(audioFile("a.ogg", "audio/ogg", 48_000), HOUR)).toBe(true);
        expect(canUploadAsIs(audioFile("a.OPUS", "audio/opus", 32_000), HOUR)).toBe(true);
    });

    it("accepts a file exactly at the limit", () => {
        const file = audioFile("a.mp3", "audio/mpeg", MAX_PASSTHROUGH_BITRATE);
        expect(canUploadAsIs(file, HOUR)).toBe(true);
    });

    it("transcodes high-bitrate mp3", () => {
        expect(canUploadAsIs(audioFile("a.mp3", "audio/mpeg", 320_000), HOUR)).toBe(false);
    });

    it("transcodes formats the backend does not forward", () => {
        expect(canUploadAsIs(audioFile("a.wav", "audio/wav", 64_000), HOUR)).toBe(false);
        expect(canUploadAsIs(audioFile("a.m4a", "audio/mp4", 64_000), HOUR)).toBe(false);
    });

    it("transcodes video and untyped files", () => {
        expect(canUploadAsIs(audioFile("a.ogg", "video/ogg", 48_000), HOUR)).toBe(false);
        expect(canUploadAsIs(audioFile("a.mp3", "", 48_000), HOUR)).toBe(false);
    });

    it("transcodes when the duration is unknown", () => {
        const file = audioFile("a.mp3", "audio/mpeg", 64_000);
        expect(canUploadAsIs(file, undefined)).toBe(false);
        expect(canUploadAsIs(file, 0)).toBe(false);
        expect(canUploadAsIs(file, Number.POSITIVE_INFINITY)).toBe(false);
    });
});
