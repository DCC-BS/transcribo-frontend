<script lang="ts" setup>
import { motion } from "motion-v";
import type { StoredTranscription } from "~/types/storedTranscription";
import { computeSpeakerStatistics, formatDuration } from "~/utils/speakerStatistics";

interface InputProps {
    transcription: StoredTranscription;
}

const props = defineProps<InputProps>();

const { t } = useI18n();

const mediaDuration = ref<number>(0);
const isLoadingDuration = ref(true);

const statistics = computed(() => computeSpeakerStatistics(props.transcription.segments));

const totalSpeakingTime = computed(() => 
    statistics.value.reduce((sum, s) => sum + s.duration, 0)
);

const speakers = computed(() => statistics.value.map((s) => s.speaker));

const { getSpeakerColor } = useSpeakerColor(speakers);

const speakingPercentage = computed(() => {
    if (mediaDuration.value <= 0) return 0;
    return (totalSpeakingTime.value / mediaDuration.value) * 100;
});

function getSpeakerColorStyle(speaker: string): string {
    const color = getSpeakerColor(speaker);
    return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}

onMounted(() => {
    if (!props.transcription.mediaFile) {
        const lastSegment = props.transcription.segments[props.transcription.segments.length - 1];
        mediaDuration.value = lastSegment?.end ?? 0;
        isLoadingDuration.value = false;
        return;
    }

    const audioSrc = URL.createObjectURL(props.transcription.mediaFile);
    const audio = new Audio();
    audio.src = audioSrc;

    audio.onloadedmetadata = () => {
        mediaDuration.value = audio.duration;
        isLoadingDuration.value = false;
        URL.revokeObjectURL(audioSrc);
        audio.onloadedmetadata = null;
    };

    audio.onerror = () => {
        const lastSegment = props.transcription.segments[props.transcription.segments.length - 1];
        mediaDuration.value = lastSegment?.end ?? 0;
        isLoadingDuration.value = false;
        URL.revokeObjectURL(audioSrc);
    };
});
</script>

<template>
    <div class="grow h-full flex flex-col">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 class="font-medium text-sm">
                {{ t("statistics.title", "Speaker Statistics") }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ t("statistics.description", "Speaking time distribution by speaker") }}
            </p>
        </div>

        <div class="flex-1 p-4 overflow-auto">
            <motion.div
                v-if="statistics.length > 0"
                class="space-y-4"
                :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }"
                :transition="{ duration: 0.3 }"
            >
                <motion.div
                    class="grid grid-cols-3 gap-3"
                    :initial="{ opacity: 0, y: -10 }"
                    :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.3 }"
                >
                    <div class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {{ t("statistics.audioDuration", "Audio Duration") }}
                        </div>
                        <div class="font-mono text-lg font-semibold">
                            <template v-if="isLoadingDuration">
                                <span class="text-gray-400">...</span>
                            </template>
                            <template v-else>
                                {{ formatDuration(mediaDuration) }}
                            </template>
                        </div>
                    </div>

                    <div class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {{ t("statistics.speakingTime", "Speaking Time") }}
                        </div>
                        <div class="font-mono text-lg font-semibold">
                            {{ formatDuration(totalSpeakingTime) }}
                        </div>
                    </div>

                    <div class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {{ t("statistics.speakingPercentage", "Speech Ratio") }}
                        </div>
                        <div class="font-mono text-lg font-semibold">
                            <template v-if="isLoadingDuration">
                                <span class="text-gray-400">...</span>
                            </template>
                            <template v-else>
                                {{ speakingPercentage.toFixed(1) }}%
                            </template>
                        </div>
                    </div>
                </motion.div>

                <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {{ t("statistics.bySpeaker", "By Speaker") }}
                    </h4>

                    <div class="space-y-2">
                        <motion.div
                            v-for="(stat, index) in statistics"
                            :key="stat.speaker"
                            class="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                            :initial="{ opacity: 0, x: -20 }"
                            :animate="{ opacity: 1, x: 0 }"
                            :transition="{ duration: 0.3, delay: index * 0.05 }"
                        >
                            <div
                                class="w-3 h-3 rounded-full shrink-0"
                                :style="{ backgroundColor: getSpeakerColorStyle(stat.speaker) }"
                            />

                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-sm truncate">
                                    {{ stat.speaker }}
                                </div>
                            </div>

                            <div class="text-right shrink-0">
                                <div class="font-mono text-sm font-medium">
                                    {{ formatDuration(stat.duration) }}
                                </div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ stat.percentage.toFixed(1) }}%
                                </div>
                            </div>

                            <div class="w-20 shrink-0">
                                <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                        class="h-full rounded-full"
                                        :style="{ backgroundColor: getSpeakerColorStyle(stat.speaker) }"
                                        :initial="{ width: 0 }"
                                        :animate="{ width: `${stat.percentage}%` }"
                                        :transition="{ duration: 0.5, delay: index * 0.05 + 0.2 }"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            <div
                v-else
                class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400"
            >
                <UIcon name="i-lucide-users" class="w-12 h-12 mb-2 opacity-50" />
                <p>{{ t("statistics.noData", "No speaker data available") }}</p>
            </div>
        </div>
    </div>
</template>
