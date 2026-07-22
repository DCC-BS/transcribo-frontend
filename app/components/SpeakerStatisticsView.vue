<script lang="ts" setup>
import { motion } from "motion-v";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import { computeSpeakerStatistics } from "~/utils/speakerStatistics";
import { formatTime } from "~/utils/time";

interface InputProps {
    transcription: StoredTranscription;
    segments: StoredSegment[];
}

const props = defineProps<InputProps>();

const { t } = useI18n();

const mediaDuration = ref<number>(0);
const isLoadingDuration = ref(true);

const statistics = computed(() => computeSpeakerStatistics(props.segments));

const totalSpeakingTime = computed(() =>
    statistics.value.reduce((sum, s) => sum + s.duration, 0),
);

const { getSpeakerColor, displayName } = useSpeakerRegistry();

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
        const lastSegment = props.segments[props.segments.length - 1];
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
        const lastSegment = props.segments[props.segments.length - 1];
        mediaDuration.value = lastSegment?.end ?? 0;
        isLoadingDuration.value = false;
        URL.revokeObjectURL(audioSrc);
    };
});
</script>

<template>
    <div id="speaker-statistics" class="grow min-h-0 flex flex-col overflow-y-auto px-5 py-8">
        <div class="mx-auto w-full max-w-225">
        <div class="mb-4">
            <h3 class="font-semibold text-sm">
                {{ t("statistics.title", "Speaker Statistics") }}
            </h3>
            <p class="text-xs text-muted mt-1">
                {{
                    t(
                        "statistics.description",
                        "Speaking time distribution by speaker",
                    )
                }}
            </p>
        </div>

        <div class="flex-1">
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
                    <div
                        class="p-3.5 rounded-2xl border border-default bg-default shadow-sm"
                    >
                        <div
                            class="text-xs text-muted mb-1"
                        >
                            {{
                                t("statistics.audioDuration", "Audio Duration")
                            }}
                        </div>
                        <div class="font-mono text-lg font-semibold">
                            <template v-if="isLoadingDuration">
                                <span class="text-dimmed">...</span>
                            </template>
                            <template v-else>
                                {{ formatTime(mediaDuration, { milliseconds: false }) }}
                            </template>
                        </div>
                    </div>

                    <div
                        class="p-3.5 rounded-2xl border border-default bg-default shadow-sm"
                    >
                        <div
                            class="text-xs text-muted mb-1"
                        >
                            {{ t("statistics.speakingTime", "Speaking Time") }}
                        </div>
                        <div class="font-mono text-lg font-semibold">
                            {{ formatTime(totalSpeakingTime, { milliseconds: false }) }}
                        </div>
                    </div>

                    <div
                        class="p-3.5 rounded-2xl border border-default bg-default shadow-sm"
                    >
                        <div
                            class="text-xs text-muted mb-1"
                        >
                            {{
                                t(
                                    "statistics.speakingPercentage",
                                    "Speech Ratio",
                                )
                            }}
                        </div>
                        <div class="font-mono text-lg font-semibold">
                            <template v-if="isLoadingDuration">
                                <span class="text-dimmed">...</span>
                            </template>
                            <template v-else>
                                {{ speakingPercentage.toFixed(1) }}%
                            </template>
                        </div>
                    </div>
                </motion.div>

                <div class="border-t border-default pt-4">
                    <h4
                        class="text-sm font-semibold mb-3"
                    >
                        {{ t("statistics.bySpeaker", "By Speaker") }}
                    </h4>

                    <div class="space-y-2">
                        <motion.div
                            v-for="(stat, index) in statistics"
                            :key="stat.speaker"
                            class="flex items-center gap-4 p-3.5 rounded-2xl border border-default bg-default shadow-sm"
                            :initial="{ opacity: 0, x: -20 }"
                            :animate="{ opacity: 1, x: 0 }"
                            :transition="{ duration: 0.3, delay: index * 0.05 }"
                        >
                            <div
                                class="w-3 h-3 rounded-full shrink-0"
                                :style="{
                                    backgroundColor: getSpeakerColorStyle(
                                        stat.speaker,
                                    ),
                                }"
                            />

                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-sm truncate">
                                    {{ displayName(stat.speaker) }}
                                </div>
                            </div>

                            <div class="text-right shrink-0">
                                <div class="font-mono text-sm font-medium">
                                    {{ formatTime(stat.duration, { milliseconds: false }) }}
                                </div>
                                <div
                                    class="text-xs text-muted"
                                >
                                    {{ stat.percentage.toFixed(1) }}%
                                </div>
                            </div>

                            <div class="w-20 shrink-0">
                                <div
                                    class="h-1.5 bg-elevated rounded-full overflow-hidden"
                                >
                                    <motion.div
                                        class="h-full rounded-full"
                                        :style="{
                                            backgroundColor:
                                                getSpeakerColorStyle(
                                                    stat.speaker,
                                                ),
                                        }"
                                        :initial="{ width: 0 }"
                                        :animate="{
                                            width: `${stat.percentage}%`,
                                        }"
                                        :transition="{
                                            duration: 0.5,
                                            delay: index * 0.05 + 0.2,
                                        }"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            <div
                v-else
                class="flex flex-col items-center justify-center h-full text-muted"
            >
                <UIcon
                    name="i-lucide-users"
                    class="w-12 h-12 mb-2 opacity-50"
                />
                <p>{{ t("statistics.noData", "No speaker data available") }}</p>
            </div>
        </div>
        </div>
    </div>
</template>
