import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useSpeakerColor } from "../../../app/composables/speakerColor";

vi.mock("../../../app/services/colorMapService", () => ({
    getColorMap: vi.fn(() => (value: number) => ({
        r: Math.floor(value * 255),
        g: Math.floor(value * 128),
        b: Math.floor(value * 64),
    })),
}));

describe("useSpeakerColor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return white color for undefined speaker", () => {
        const speakers = ref<string[]>([]);
        const { getSpeakerColor } = useSpeakerColor(speakers);

        const color = getSpeakerColor(undefined);
        expect(color).toEqual({ r: 1, g: 1, b: 1 });
    });

    it("should return white color for unknown speaker", () => {
        const speakers = ref<string[]>(["Speaker 1"]);
        const { getSpeakerColor } = useSpeakerColor(speakers);

        const color = getSpeakerColor("Unknown Speaker");
        expect(color).toEqual({ r: 1, g: 1, b: 1 });
    });

    it("should return color for known speaker", () => {
        const speakers = ref<string[]>(["Speaker 1"]);
        const { getSpeakerColor, colorDict } = useSpeakerColor(speakers);

        const color = getSpeakerColor("Speaker 1");
        expect(color).toEqual(colorDict.value["Speaker 1"]);
    });

    it("should handle multiple speakers", () => {
        const speakers = ref<string[]>(["Speaker 1", "Speaker 2", "Speaker 3"]);
        const { getSpeakerColor, colorDict } = useSpeakerColor(speakers);

        expect(colorDict.value["Speaker 1"]).toBeDefined();
        expect(colorDict.value["Speaker 2"]).toBeDefined();
        expect(colorDict.value["Speaker 3"]).toBeDefined();
    });

    it("should update colors when speakers change", () => {
        const speakers = ref<string[]>(["Speaker 1"]);
        const { colorDict } = useSpeakerColor(speakers);

        const initialColor = colorDict.value["Speaker 1"];

        speakers.value = ["Speaker 1", "Speaker 2"];

        expect(colorDict.value["Speaker 1"]).toBeDefined();
        expect(colorDict.value["Speaker 2"]).toBeDefined();
    });

    it("should filter out undefined values in speakers array", () => {
        const speakers = ref<(string | undefined)[]>(["Speaker 1", undefined, "Speaker 2"]);
        const { colorDict } = useSpeakerColor(speakers);

        expect(colorDict.value["Speaker 1"]).toBeDefined();
        expect(colorDict.value["Speaker 2"]).toBeDefined();
        expect(colorDict.value[undefined]).toBeUndefined();
    });

    it("should handle empty speakers array", () => {
        const speakers = ref<string[]>([]);
        const { colorDict, getSpeakerColor } = useSpeakerColor(speakers);

        expect(Object.keys(colorDict.value)).toHaveLength(0);
        expect(getSpeakerColor("Any")).toEqual({ r: 1, g: 1, b: 1 });
    });
});
