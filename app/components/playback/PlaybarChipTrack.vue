<script setup lang="ts">
/*
    Slim seek line with the draggable time chip riding on it — the same
    chip as on the editor lanes' time bar, so every playbar scrubs the
    same way. Click seeks, dragging the chip scrubs continuously.
*/
import { clamp01 } from "~/utils/math";

const props = defineProps<{
    currentTime: number;
    duration: number;
    compactChip?: boolean;
}>();

const emit = defineEmits<(e: "seek", seconds: number) => void>();

const track = ref<HTMLElement>();
const dragging = ref(false);

const pct = computed(() =>
    props.duration > 0 ? (props.currentTime / props.duration) * 100 : 0,
);

/**
 * Playback time under a horizontal client coordinate.
 *
 * @param clientX - Client x coordinate.
 * @returns Time in seconds.
 */
function timeAtClientX(clientX: number): number {
    const rect = track.value?.getBoundingClientRect();
    if (!rect || props.duration <= 0) {
        return 0;
    }
    const ratio = (clientX - rect.left) / rect.width;
    return clamp01(ratio) * props.duration;
}

/**
 * Starts a scrub drag, seeking continuously until the pointer is released.
 *
 * @param event - The pointer event starting the drag.
 */
function onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    dragging.value = true;
    emit("seek", timeAtClientX(event.clientX));
    const move = (ev: PointerEvent) => emit("seek", timeAtClientX(ev.clientX));
    window.addEventListener("pointermove", move);
    window.addEventListener(
        "pointerup",
        () => {
            window.removeEventListener("pointermove", move);
            dragging.value = false;
        },
        { once: true },
    );
}
</script>

<template>
    <div
        ref="track"
        class="relative h-6.5 min-w-0 flex-1 cursor-pointer"
        @pointerdown="onPointerDown"
    >
        <div
            class="absolute inset-x-0 top-1/2 h-0.75 -translate-y-1/2 rounded-full bg-border"
        />
        <div
            class="absolute top-1/2 left-0 h-0.75 -translate-y-1/2 rounded-full bg-primary"
            :style="{ width: `${pct}%` }"
        />
        <TimeChip
            :time="props.currentTime"
            :pct="pct"
            :dragging="dragging"
            :compact="props.compactChip"
            @pointerdown.stop="onPointerDown"
        />
    </div>
</template>
