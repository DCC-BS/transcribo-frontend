import type { LineConfig } from "konva/lib/shapes/Line";

export function useMediaTimeline(inputs: {
    mediaDuration: Ref<number>,
    stageWidth: Ref<number>,
    stageHeight: Ref<number>,
    zoomX: Ref<number>,
    offsetX: Ref<number>,
    currentTime: Ref<number>
}) {

    const { mediaDuration, stageWidth, stageHeight, zoomX, offsetX, currentTime } = inputs;

    const scaleFactor = computed(() => {
        return (stageWidth.value / mediaDuration.value) * zoomX.value
    });

    function toPixelScale(value: number): number {
        return value * scaleFactor.value + offsetX.value;
    }

    const playheadLineConfig = computed(() => ({
        points: [
            toPixelScale(currentTime.value), 0,
            toPixelScale(currentTime.value), stageHeight.value,
        ],
        stroke: 'red',
        strokeWidth: 1,
    } as LineConfig));

    return { scaleFactor, playheadLineConfig, toPixelScale }
}