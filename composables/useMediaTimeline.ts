import type { LayerConfig } from "konva/lib/Layer";
import type { LineConfig } from "konva/lib/shapes/Line";

export function useMediaTimeline(inputs: {
    mediaDuration: Ref<number>,
    stageWidth: Ref<number>,
    stageHeight: Ref<number>,
    zoomX: Ref<number>,
    startTime: Ref<number>,
    currentTime: Ref<number>
}) {

    const { mediaDuration, stageWidth, stageHeight, startTime, currentTime, zoomX } = inputs;

    const scaleFactor = computed(() => {
        return (stageWidth.value / mediaDuration.value)
    });

    function fromTimetoPixelSpace(value: number): number {
        return value * scaleFactor.value;
    }

    function fromPixeltoTimeSpace(value: number): number {
        return value / scaleFactor.value;
    }

    const playheadLineConfig = computed(() => ({
        points: [
            fromTimetoPixelSpace(currentTime.value), 0,
            fromTimetoPixelSpace(currentTime.value), stageHeight.value,
        ],
        stroke: 'red',
        strokeWidth: 1,
        strokeScaleEnabled: false,
    } as LineConfig));

    const transformedLayerConfig = computed(() => ({
        offsetX: offsetX.value,
        scaleX: zoomX.value,
        y: 0,
    } as LayerConfig));

    const offsetX = computed(() => startTime.value * scaleFactor.value);

    return { scaleFactor, offsetX, playheadLineConfig, transformedLayerConfig, fromTimetoPixelSpace, fromPixeltoTimeSpace }
}