<script setup lang="ts">
import { formatTime } from "~/utils/time";

/*
    Draggable black time chip riding on a seek line/ruler. Positions itself
    at `pct` % of its relative parent and clamps its own edges inside the
    parent, so it never overhangs (no scrollbar growth, no overlap with
    neighboring labels). Pointer handling stays with the parent — it
    receives the chip's pointerdown through normal event fallthrough.
*/
const props = defineProps<{
    time: number;
    pct: number;
    dragging?: boolean;
    compact?: boolean;
}>();

const chipEl = ref<HTMLElement>();
const halfWidth = ref(22);

/**
 * Re-measures the chip so it can be centered on the playhead.
 */
function measure(): void {
    if (chipEl.value) {
        halfWidth.value = chipEl.value.offsetWidth / 2;
    }
}

onMounted(measure);
watch(
    () => [formatTime(props.time, { milliseconds: false }).length, props.compact],
    () => nextTick(measure),
);

// 1px safety margin against sub-pixel rounding at the right edge
const left = computed(
    () =>
        `clamp(${halfWidth.value}px, ${props.pct}%, calc(100% - ${halfWidth.value + 1}px))`,
);
</script>

<template>
    <button
        ref="chipEl"
        type="button"
        class="absolute top-1/2 z-9 -translate-x-1/2 -translate-y-1/2 cursor-grab whitespace-nowrap bg-(--ui-text) font-semibold tabular-nums text-(--ui-bg)"
        :class="[
            props.compact
                ? 'size-3 rounded-full'
                : 'rounded-[5px] px-1.5 py-0.75 text-[0.66rem]',
            { 'cursor-grabbing': props.dragging },
        ]"
        :style="{ left }"
        :aria-label="formatTime(props.time, { milliseconds: false })"
    >
        <span v-if="!props.compact">
            {{ formatTime(props.time, { milliseconds: false }) }}
        </span>
    </button>
</template>
