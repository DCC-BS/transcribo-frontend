<script setup lang="ts">
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import { formatTime } from "~/utils/time";

const props = defineProps<{
    transcription: StoredTranscription;
    segments: StoredSegment[];
    duration: number;
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
    hasVideo: boolean;
    mergeSegments?: boolean;
    /** Follow the active speaker's lane while playing. */
    autoScroll?: boolean;
}>();

const emit = defineEmits<{
    togglePlay: [];
    seek: [seconds: number];
    setRate: [rate: number];
    addSegment: [start: number, end: number];
}>();

const showVideo = defineModel<boolean>("showVideo", { default: false });

const { t } = useI18n();
const { speakerIds } = useSpeakerRegistry();

const zoom = ref(1);
const compact = useEditorDockCompact();

function toggleVideo(event: MouseEvent): void {
    showVideo.value = !showVideo.value;
    if (event.currentTarget instanceof HTMLButtonElement) {
        event.currentTarget.blur();
    }
}

function expandLanes(): void {
    compact.value = false;
}

function collapseLanes(): void {
    compact.value = true;
}

// on phones the lanes take too much of the viewport — start collapsed
onMounted(() => {
    if (window.innerWidth < 640) {
        compact.value = true;
    }
});

// ---- vertical lanes resize (drag handle at the top edge of the dock) --

const LANE_ROW = 44;
const RULER = 27;
const lanesHeight = useLocalStorage<number>(
    "editor-lanes-height",
    4 * LANE_ROW + RULER,
);

const maxLanesHeight = computed(
    () => speakerIds.value.length * LANE_ROW + RULER,
);

function beginDockResize(event: PointerEvent): void {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = lanesHeight.value;
    const move = (ev: PointerEvent) => {
        // dragging up enlarges, capped once every speaker is visible;
        // down stops at one lane (collapsing is the chevron's job)
        const next = startHeight + (startY - ev.clientY);
        lanesHeight.value = Math.min(
            Math.max(next, LANE_ROW + RULER),
            Math.max(maxLanesHeight.value, LANE_ROW + RULER),
        );
    };
    window.addEventListener("pointermove", move);
    window.addEventListener(
        "pointerup",
        () => window.removeEventListener("pointermove", move),
        { once: true },
    );
}

// Exponential zoom slider: value is log2(zoom), so 1× sits exactly in the
// middle between - and + (range 0.125×–8×) and each step feels equal.
const zoomExp = computed({
    get: () => Math.log2(zoom.value),
    set: (value) => {
        zoom.value = 2 ** value;
    },
});


function requestSegmentAtPlayhead(): void {
    const start = props.currentTime;
    const end = props.duration
        ? Math.min(start + 2, props.duration)
        : start + 2;
    emit("addSegment", start, end);
}

</script>

<template>
    <div class="relative flex-none border-t border-default bg-default">
        <!-- resize handle: invisible strip straddling the dock's top edge.
             Absolute overlay so it adds no layout height — otherwise the
             transport row's centered play group sits visibly off-center. -->
        <div
            v-if="!compact"
            class="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize touch-none"
            :title="t('editor.dock.resizeLanes')"
            @pointerdown="beginDockResize"
        />

        <!-- compact: transport row with a plain seek bar instead of lanes -->
        <div
            v-if="compact"
            class="flex flex-wrap items-center gap-2.5 px-3.5 py-1.75"
        >
            <div class="flex items-center gap-3">
                <span
                    class="text-[0.78rem] tabular-nums text-muted"
                >
                    {{
                        formatTime(currentTime, {
                            milliseconds: false,
                            minimumMinuteDigits: 2,
                        })
                    }} /
                    {{ formatTime(props.duration, { milliseconds: false }) }}
                </span>
                <PlayButton
                    :playing="isPlaying"
                    tone="contrast"
                    @click="emit('togglePlay')"
                />
                <PlaybackSpeedButton
                    :model-value="playbackRate"
                    @update:model-value="emit('setRate', $event)"
                />
            </div>

            <!-- same chip-on-a-line as the expanded lanes' time bar -->
            <PlaybarChipTrack
                class="mx-3"
                :current-time="currentTime"
                :duration="props.duration"
                @seek="emit('seek', $event)"
            />

            <UButton
                v-if="hasVideo"
                icon="i-lucide-video"
                variant="ghost"
                color="neutral"
                size="xs"
                :title="t('editor.dock.toggleVideo')"
                @click="toggleVideo"
            >
                <span class="hidden md:inline">
                    {{ t("editor.dock.video") }}
                </span>
            </UButton>
            <UButton
                icon="i-lucide-chevron-up"
                variant="ghost"
                color="neutral"
                size="xs"
                :title="t('editor.dock.toggleLanes')"
                @click="expandLanes"
            />
        </div>

        <!-- expanded: the transport toolbar lives in the lanes head row -->
        <EditorSpeakerLanes
            v-else
            id="editor-lanes"
            v-model:zoom="zoom"
            :transcription="props.transcription"
            :segments="props.segments"
            :current-time="currentTime"
            :duration="props.duration"
            :merge-segments="props.mergeSegments"
            :auto-scroll="props.autoScroll"
            :viewport-height="lanesHeight"
            @seek="emit('seek', $event)"
        >
            <template #toolbar>
                <div class="flex items-center gap-2 text-muted">
                    <UIcon name="i-lucide-zoom-out" class="size-4" />
                    <USlider
                        v-model="zoomExp"
                        :min="-3"
                        :max="3"
                        :step="0.25"
                        class="w-28"
                        :title="t('editor.dock.zoom')"
                    />
                    <UIcon name="i-lucide-zoom-in" class="size-4" />
                    <UButton
                        icon="i-lucide-rotate-ccw"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        :title="t('editor.dock.zoomReset')"
                        @click="zoom = 1"
                    />
                </div>
                <UButton
                    id="dock-add-segment"
                    icon="i-lucide-plus"
                    variant="soft"
                    color="neutral"
                    size="xs"
                    :title="t('editor.dock.addSegment')"
                    @click="requestSegmentAtPlayhead"
                >
                    <span class="hidden md:inline">
                        {{ t("editor.dock.segment") }}
                    </span>
                </UButton>

                <!-- centered on the whole dock row (like the appbar tabs),
                     independent of the differing widths left and right; on
                     phones it flows inline instead — absolute centering
                     overlaps the speaker column and zoom controls there -->
                <div
                    class="static flex items-center gap-3 sm:absolute sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
                >
                    <span
                        class="text-[0.78rem] tabular-nums text-muted"
                    >
                        {{
                            formatTime(currentTime, {
                                milliseconds: false,
                                minimumMinuteDigits: 2,
                            })
                        }} /
                        {{ formatTime(props.duration, { milliseconds: false }) }}
                    </span>
                    <PlayButton
                        :playing="isPlaying"
                        tone="contrast"
                        @click="emit('togglePlay')"
                    />
                    <PlaybackSpeedButton
                        :model-value="playbackRate"
                        @update:model-value="emit('setRate', $event)"
                    />
                </div>

                <div class="grow" />
                <UButton
                    v-if="hasVideo"
                    icon="i-lucide-video"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :title="t('editor.dock.toggleVideo')"
                    @click="toggleVideo"
                >
                    <span class="hidden md:inline">
                        {{ t("editor.dock.video") }}
                    </span>
                </UButton>
                <UButton
                    icon="i-lucide-chevron-down"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :title="t('editor.dock.toggleLanes')"
                    @click="collapseLanes"
                />
            </template>
        </EditorSpeakerLanes>
    </div>
</template>
