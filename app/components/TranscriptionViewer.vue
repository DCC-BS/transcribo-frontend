<script lang="ts" setup>
import type { StoredTranscription } from "~/types/storedTranscription";
import type { SegmentWithId } from "~/types/transcriptionResponse";

interface InputProps {
    transcription: StoredTranscription
}

const props = defineProps<InputProps>();

// Viewer mode options
const showSpeakers = ref(true);
const showTimestamps = ref(false);
const mergeSegments = ref(false);

/**
 * Merges consecutive segments from the same speaker into single segments
 * @param segments - Array of segments to merge
 * @returns Array of merged segments
 */
function mergeConsecutiveSegments(
    segments: SegmentWithId[],
): SegmentWithId[] {
    if (segments.length === 0) return [];

    const merged: SegmentWithId[] = [];
    let currentSegment = { ...segments[0] };

    for (let i = 1; i < segments.length; i++) {
        const nextSegment = segments[i];
        if (!nextSegment) continue;

        // If same speaker and segments are consecutive, merge them
        if (
            currentSegment.speaker === nextSegment.speaker &&
            Math.abs((currentSegment.end ?? 0) - nextSegment.start) < 1.0
        ) {
            currentSegment.text =
                `${currentSegment.text} ${nextSegment.text}`.trim();
            currentSegment.end = nextSegment.end;
        } else {
            // Different speaker, save current and start new
            merged.push(currentSegment as SegmentWithId);
            currentSegment = { ...nextSegment };
        }
    }

    // Don't forget the last segment
    merged.push(currentSegment as SegmentWithId);
    return merged;
}

// Computed property to generate the formatted text
const formattedTranscript = computed(() => {
    let segments = props.transcription.segments;

    // Merge segments if requested
    if (mergeSegments.value) {
        segments = mergeConsecutiveSegments(segments);
    }

    return segments
        .map((s) => {
            let line = "";

            // Add timestamps if requested
            if (showTimestamps.value) {
                line += `${formatTime(s.start)} - ${formatTime(s.end)}`;
            }

            // Add speaker if requested
            if (showSpeakers.value) {
                if (showTimestamps.value) {
                    line += ` ${s.speaker}:`;
                } else {
                    line += `${s.speaker}:`;
                }
            }

            // Add separator between metadata and text
            if (showTimestamps.value || showSpeakers.value) {
                line += " ";
            }

            line += s.text;
            return line;
        })
        .join("\n");
});

const { t } = useI18n();
</script>

<template>
    <div class="h-full flex flex-col">
        <!-- Viewer Controls -->
        <div class="flex items-center gap-4 p-4 border-b border-gray-200 bg-gray-50">
            <h3 class="font-medium text-sm">{{ t('viewer.displayOptions') }}</h3>

            <!-- Show Speakers Toggle -->
            <div class="flex items-center gap-2">
                <USwitch v-model="showSpeakers" size="sm" />
                <span class="text-sm">{{ t('viewer.showSpeakers') }}</span>
            </div>

            <!-- Show Timestamps Toggle -->
            <div class="flex items-center gap-2">
                <USwitch v-model="showTimestamps" size="sm" />
                <span class="text-sm">{{ t('viewer.showTimestamps') }}</span>
            </div>

            <!-- Merge Segments Toggle -->
            <div class="flex items-center gap-2">
                <USwitch v-model="mergeSegments" size="sm" />
                <span class="text-sm">{{ t('viewer.mergeSegments') }}</span>
            </div>
        </div>

        <!-- Transcript Display -->
        <div class="flex-1 p-4 overflow-hidden">
            <textarea v-model="formattedTranscript" :placeholder="t('viewer.placeholder')" readonly
                class="w-full h-full resize-none font-mono text-sm leading-relaxed p-3 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
    </div>
</template>
