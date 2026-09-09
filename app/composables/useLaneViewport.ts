import { useResizeObserver } from "@vueuse/core";
import type { EditorLaneCanvasProps } from "~/types/editorTimeline";
import { clamp } from "~/utils/math";

const ZOOM_MIN = 0.125;
const ZOOM_MAX = 8;

interface ZoomAnchor {
    time: number;
    screenX: number;
}

interface TimelineApi {
    timeToX: (seconds: number) => number;
    xToTime: (x: number) => number;
    trackWidth: ComputedRef<number>;
}

/*
    Viewport concerns for the lane canvas: measuring the track width, keeping
    the active speaker's lane visible, centering the playhead, and zooming on
    wheel input while preserving the point under the cursor.
*/
export function useLaneViewport(
    props: EditorLaneCanvasProps,
    zoom: Ref<number>,
    onSeek: (seconds: number) => void,
    viewport: Ref<HTMLElement | undefined>,
    rulerBar: Ref<HTMLElement | undefined>,
    baseTrackWidth: Ref<number>,
    timeline: TimelineApi,
) {
    const zoomAnchor = ref<ZoomAnchor>();

    /**
     * Recomputes the track width from the viewport and the current zoom.
     */
    function updateWidth(): void {
        if (!viewport.value) {
            return;
        }
        baseTrackWidth.value = Math.max(
            Math.floor(
                viewport.value.clientWidth - props.viewport.labelWidth - 1,
            ),
            250,
        );
    }

    /**
     * Scrolls the lane of the active speaker into view, when auto-scroll is on.
     *
     * @param behavior - Scroll behavior.
     */
    function scrollActiveSpeakerIntoView(
        behavior: ScrollBehavior = "smooth",
    ): void {
        const container = viewport.value;
        const speaker = props.active.speaker;
        if (!container || !speaker || !props.active.autoScroll) {
            return;
        }

        const lane = container.querySelector<HTMLElement>(
            `[data-speaker-lane-label][data-lane="${CSS.escape(speaker)}"]`,
        );
        if (!lane) {
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const laneRect = lane.getBoundingClientRect();
        const rulerRect = rulerBar.value?.getBoundingClientRect();
        const visibleBottom = rulerRect
            ? Math.min(containerRect.bottom, rulerRect.top)
            : containerRect.bottom;

        let scrollDelta = 0;
        if (laneRect.top < containerRect.top) {
            scrollDelta = laneRect.top - containerRect.top;
        } else if (laneRect.bottom > visibleBottom) {
            scrollDelta = laneRect.bottom - visibleBottom;
        }

        if (scrollDelta !== 0) {
            container.scrollBy({ top: scrollDelta, behavior });
        }
    }

    /**
     * Scrolls the track so a playback time sits in the middle of the viewport.
     *
     * @param time - Time in seconds.
     */
    function centerTimeInView(time: number): void {
        const element = viewport.value;
        if (!element || element.scrollWidth <= element.clientWidth) {
            return;
        }

        const visibleWidth = Math.max(
            element.clientWidth - props.viewport.labelWidth,
            1,
        );
        const targetX = timeline.timeToX(time);
        const maxScrollLeft = element.scrollWidth - element.clientWidth;
        element.scrollLeft = Math.min(
            Math.max(targetX - visibleWidth / 2, 0),
            maxScrollLeft,
        );
    }

    /**
     * Lets a wheel event over the speaker labels scroll them vertically.
     *
     * @param event - The wheel event.
     * @returns `true` when the event was consumed as a label scroll.
     */
    function scrollSpeakerLabels(event: WheelEvent): boolean {
        const element = viewport.value;
        const target = event.target;
        if (
            !element ||
            !(target instanceof Element) ||
            !target.closest("[data-speaker-lane-label]")
        ) {
            return false;
        }

        event.preventDefault();
        const rawDelta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
        const multiplier =
            event.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? 16
                : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                  ? element.clientHeight
                  : 1;
        element.scrollTop += rawDelta * multiplier;
        return true;
    }

    /**
     * Zooms the timeline on wheel input, unless the labels consumed the event.
     *
     * @param event - The wheel event.
     */
    function onWheel(event: WheelEvent): void {
        if (scrollSpeakerLabels(event)) {
            return;
        }
        event.preventDefault();
        const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
        if (delta === 0) {
            return;
        }
        if (event.shiftKey) {
            const element = viewport.value;
            if (element) {
                const rect = element.getBoundingClientRect();
                const visibleWidth = Math.max(
                    element.clientWidth - props.viewport.labelWidth,
                    1,
                );
                const screenX = Math.min(
                    Math.max(
                        event.clientX - rect.left - props.viewport.labelWidth,
                        0,
                    ),
                    visibleWidth,
                );
                zoomAnchor.value = {
                    time: timeline.xToTime(element.scrollLeft + screenX),
                    screenX,
                };
            }
            zoom.value = Math.min(
                Math.max(zoom.value * 2 ** (-delta / 400), ZOOM_MIN),
                ZOOM_MAX,
            );
            return;
        }
        const visibleSpan =
            props.timeline.duration / Math.max(zoom.value, ZOOM_MIN);
        const nextTime = Math.min(
            Math.max(
                props.timeline.currentTime + (delta / 100) * visibleSpan * 0.02,
                0,
            ),
            props.timeline.duration,
        );
        onSeek(nextTime);
        centerTimeInView(nextTime);
    }

    useResizeObserver(viewport, () => {
        updateWidth();
        scrollActiveSpeakerIntoView("auto");
    });
    useResizeObserver(rulerBar, () => scrollActiveSpeakerIntoView("auto"));
    watch(() => props.viewport.labelWidth, updateWidth);
    watch(
        [
            () => props.active.speaker,
            () => props.active.autoScroll,
            () => props.speakers.ids.join("\u0000"),
        ],
        async () => {
            await nextTick();
            scrollActiveSpeakerIntoView();
        },
        { flush: "post" },
    );

    watch(zoom, async (next, previous) => {
        const element = viewport.value;
        if (!element || next === previous || props.timeline.duration <= 0) {
            return;
        }
        const visibleWidth = Math.max(
            element.clientWidth - props.viewport.labelWidth,
            1,
        );
        const explicitAnchor = zoomAnchor.value;
        zoomAnchor.value = undefined;
        let anchorTime: number;
        let anchorOffset: number;
        if (explicitAnchor) {
            anchorTime = explicitAnchor.time;
            anchorOffset = explicitAnchor.screenX;
        } else {
            const oldWidth = Math.max(baseTrackWidth.value * previous, 56);
            const viewStart = element.scrollLeft;
            const currentX =
                (props.timeline.currentTime / props.timeline.duration) *
                oldWidth;
            const currentVisible =
                currentX >= viewStart && currentX <= viewStart + visibleWidth;
            const anchorX = currentVisible
                ? currentX
                : viewStart + visibleWidth / 2;
            anchorTime = (anchorX / oldWidth) * props.timeline.duration;
            anchorOffset = anchorX - viewStart;
        }
        await nextTick();
        element.scrollLeft = Math.max(
            (anchorTime / props.timeline.duration) * timeline.trackWidth.value -
                anchorOffset,
            0,
        );
    });

    watch(zoom, (value) => {
        const clamped = clamp(value, ZOOM_MIN, ZOOM_MAX);
        if (clamped !== value) {
            zoom.value = clamped;
        }
    });

    return { updateWidth, onWheel };
}
