import { describe, expect, it } from "vitest";
import { isVideoFile } from "../../../app/utils/videoUtils";

describe("isVideoFile", () => {
    describe("video files", () => {
        it("should return true for mp4 video", () => {
            const file = new File([""], "video.mp4", { type: "video/mp4" });
            expect(isVideoFile(file)).toBe(true);
        });

        it("should return true for webm video", () => {
            const file = new File([""], "video.webm", { type: "video/webm" });
            expect(isVideoFile(file)).toBe(true);
        });

        it("should return true for quicktime video", () => {
            const file = new File([""], "video.mov", { type: "video/quicktime" });
            expect(isVideoFile(file)).toBe(true);
        });

        it("should return true for avi video", () => {
            const file = new File([""], "video.avi", { type: "video/x-msvideo" });
            expect(isVideoFile(file)).toBe(true);
        });
    });

    describe("non-video files", () => {
        it("should return false for audio files", () => {
            const file = new File([""], "audio.mp3", { type: "audio/mpeg" });
            expect(isVideoFile(file)).toBe(false);
        });

        it("should return false for image files", () => {
            const file = new File([""], "image.png", { type: "image/png" });
            expect(isVideoFile(file)).toBe(false);
        });

        it("should return false for text files", () => {
            const file = new File([""], "text.txt", { type: "text/plain" });
            expect(isVideoFile(file)).toBe(false);
        });

        it("should return false for empty type", () => {
            const file = new File([""], "file.bin", { type: "" });
            expect(isVideoFile(file)).toBe(false);
        });

        it("should return false for Blob with non-video type", () => {
            const blob = new Blob([""], { type: "audio/wav" });
            expect(isVideoFile(blob)).toBe(false);
        });
    });

    describe("Blob vs File", () => {
        it("should work with Blob objects", () => {
            const blob = new Blob([""], { type: "video/mp4" });
            expect(isVideoFile(blob)).toBe(true);
        });

        it("should work with File objects", () => {
            const file = new File([""], "video.mp4", { type: "video/mp4" });
            expect(isVideoFile(file)).toBe(true);
        });
    });
});
