<script lang="ts" setup>
import { formatTime } from '~/utils/time';

interface TimeAxisProps {
    startTime: number;
    endTime: number;
    zoomX: number;
    stageWidth: number;
}

const props = defineProps<TimeAxisProps>();

// Calculate time axis ticks based on visible time range
const timeTicks = computed(() => {
    const visibleDuration = props.endTime - props.startTime;

    // Determine appropriate tick interval based on zoom level and stage width
    // We aim for approximately 5-10 ticks across the visible area
    let tickIntervalSeconds: number;

    if (visibleDuration <= 10) { // 0-10 seconds visible
        tickIntervalSeconds = 1; // 1 second intervals
    } else if (visibleDuration <= 60) { // 10-60 seconds visible
        tickIntervalSeconds = 5; // 5 second intervals
    } else if (visibleDuration <= 300) { // 1-5 minutes visible
        tickIntervalSeconds = 30; // 30 second intervals
    } else if (visibleDuration <= 1800) { // 5-30 minutes visible
        tickIntervalSeconds = 60; // 1 minute intervals
    } else { // > 30 minutes
        tickIntervalSeconds = 300; // 5 minute intervals
    }

    // Generate tick positions and labels
    const ticks = [];
    // Round start time to nearest tick interval
    const firstTick = Math.ceil(props.startTime / tickIntervalSeconds) * tickIntervalSeconds;

    for (let time = firstTick; time <= props.endTime; time += tickIntervalSeconds) {
        // Calculate x position for the tick mark
        const x = fromTimetoPixelSpace(time);
        ticks.push({
            x,
            time,
            label: formatTime(time)
        });
    }

    return ticks;
});

// Convert time to pixel position
function fromTimetoPixelSpace(time: number): number {
    // Calculate what percentage of the visible range this time represents
    const timePercentage = (time - props.startTime) / (props.endTime - props.startTime);
    // Convert to pixel space
    return timePercentage * props.stageWidth * props.zoomX;
}
</script>

<template>
    <v-layer>
        <!-- Time tick marks -->
        <template v-for="(tick, index) in timeTicks" :key="index">
            <!-- Vertical tick line -->
            <v-line :config="{
                points: [tick.x, 0, tick.x, 10],
                stroke: '#555',
                strokeWidth: 1
            }" />

            <!-- Tick label -->
            <v-text :config="{
                x: tick.x,
                y: 10,
                text: tick.label,
                fontSize: 10,
                fill: '#555',
                align: 'center',
                offsetX: 0
            }" />
        </template>
    </v-layer>
</template>
