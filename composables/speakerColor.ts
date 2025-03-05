import { getColorMap } from "~/services/colorMapService";
import type { RGBColor } from "~/types/color";

export function useSpeakerColor(speakers: Ref<(string | undefined)[]>) {

    const speakerSet = computed(() =>
        Array.from(
            new Set<string>(speakers.value.filter((speaker) => speaker).map((speaker) => speaker!))
        )
    );

    const colorMap = getColorMap('rainbow');

    // Compute a dictionary mapping each speaker to their color
    const colorDict = computed(() => speakerSet.value.reduce((acc, speaker, index) => {
        const t = index / speakerSet.value.length;

        acc[speaker] = colorMap(t);

        return acc;
    }, {} as Record<string, RGBColor>));

    function getSpeakerColor(speaker: string | undefined): RGBColor {
        if (!speaker || !colorDict.value[speaker]) {
            return { r: 1, g: 1, b: 1 };
        }

        return colorDict.value[speaker];
    }

    return {
        getSpeakerColor,
        colorDict,
    };
}
