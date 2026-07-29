<script lang="ts" setup>
import { v4 as uuidv4 } from "uuid";
import type {
    MediaConfigureData,
    MediaSelectionData,
} from "~/types/mediaStepInOut";
import type { StoredTask, TaskStatus } from "~/types/storedTasks";

const emit = defineEmits<(e: "onNext", payload: MediaConfigureData) => void>();
const input = defineModel<MediaSelectionData>("input", { required: true });
const { addTask, deleteTask } = useTasks();

const { t } = useI18n();

const language = ref<string>("de");
const numSpeaker = ref<string>("auto");

const speakerOptions = [
    { label: t("upload.autoDetection"), value: "auto" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
];

const audioLanguageOptions = useLanguageOptions();

const isVideo = computed(() => isVideoFile(input.value.media));
// side-effect-free: URL created in a watch, previous one revoked — a
// computed with createObjectURL leaks a blob URL per recompute
const mediaSource = ref("");
watch(
    () => input.value.media,
    (media) => {
        if (mediaSource.value) {
            URL.revokeObjectURL(mediaSource.value);
        }
        mediaSource.value = URL.createObjectURL(media);
    },
    { immediate: true },
);
const task = ref<StoredTask>();

watch(
    input,
    async () => {
        if (task.value) {
            await deleteTask(task.value.id);
        }

        const newId = uuidv4();
        const newStatus = {
            progress: 0,
            status: "pending",
            task_id: input.value.taskId ?? newId,
            created_at: new Date(),
        } as TaskStatus;
        task.value = await addTask(
            newStatus,
            input.value.media,
            input.value.media.name,
            input.value.media.type,
        );
    },
    { immediate: true },
);

onUnmounted(() => {
    URL.revokeObjectURL(mediaSource.value);
});

/**
 * Renders a byte count in the largest fitting unit.
 *
 * @param bytes - Size in bytes.
 * @returns The formatted size, e.g. `"12.5 MB"`.
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Hands the configured media and its task on to the next upload step.
 */
function onNext() {
    if (!task.value) {
        return;
    }

    const outputData: MediaConfigureData = {
        task: task.value,
        media: input.value.media,
        numSpeaker: numSpeaker.value,
        language: language.value,
    };
    emit("onNext", outputData);
}
</script>

<template>
    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.15fr_1fr]">
        <UCard class="min-w-0" :ui="{ body: 'flex flex-col gap-5 p-6' }">
            <CardHead
                :icon="isVideo ? 'i-lucide-video' : 'i-lucide-audio-lines'"
                tone="primary"
                size="lg"
                :title="input.media.name"
                :subtitle="formatFileSize(input.media.size)"
            />
            <div
                v-if="isVideo"
                class="overflow-hidden rounded-xl bg-black"
            >
                <!-- biome-ignore lint/a11y/useMediaCaption: User-uploaded media may not have captions -->
                <video
                    controls
                    class="h-auto w-full object-contain"
                    :src="mediaSource"
                    :type="input.media.type"
                >
                    Your browser does not support the video tag.
                </video>
            </div>
            <!-- biome-ignore lint/a11y/useMediaCaption: User-uploaded media may not have captions -->
            <audio
                v-else
                controls
                class="h-12 w-full"
                :src="mediaSource"
                :type="input.media.type"
            >
                Your browser does not support the audio element.
            </audio>
        </UCard>

        <UCard class="lg:sticky lg:top-4 overflow-hidden shadow-md" :ui="{ body: 'p-0 sm:p-0' }">
            <div
                class="flex items-center gap-3 bg-primary px-4.5 py-3.5 text-(--ui-on-primary)"
            >
                <span
                    class="grid size-10 flex-none place-items-center rounded-[11px] bg-white/20 dark:bg-black/15"
                >
                    <UIcon name="i-lucide-settings-2" class="size-5" />
                </span>
                <div class="min-w-0">
                    <strong class="block text-[0.95rem]">
                        {{ t("upload.settings") }}
                    </strong>
                    <small class="text-[0.78rem] opacity-85">
                        {{ t("upload.configureTranscription") }}
                    </small>
                </div>
            </div>

            <div class="flex flex-col gap-4 p-4.5">
                <div class="flex flex-col gap-1.5">
                    <!-- biome-ignore lint/a11y/noLabelWithoutControl: associated via for/id with the USelect below (id forwarded to native control) -->
                    <label
                        for="num-speakers"
                        class="flex items-center gap-2 text-sm font-semibold"
                    >
                        <UIcon
                            name="i-lucide-users"
                            class="size-4 text-(--ui-primary-strong)"
                        />
                        {{ t("upload.numSpeakers") }}
                    </label>
                    <p class="text-xs leading-relaxed text-muted">
                        {{ t("upload.numSpeakersHelp") }}
                    </p>
                    <USelect
                        id="num-speakers"
                        v-model="numSpeaker"
                        :items="speakerOptions"
                        size="lg"
                        class="w-full"
                    />
                </div>

                <div class="flex flex-col gap-1.5">
                    <!-- biome-ignore lint/a11y/noLabelWithoutControl: associated via for/id with the USelectMenu below (id forwarded to native control) -->
                    <label
                        for="audio-language"
                        class="flex items-center gap-2 text-sm font-semibold"
                    >
                        <UIcon
                            name="i-lucide-globe"
                            class="size-4 text-(--ui-primary-strong)"
                        />
                        {{ t("upload.audioLanguage") }}
                    </label>
                    <p class="text-xs leading-relaxed text-muted">
                        {{ t("upload.audioLanguageHelp") }}
                    </p>
                    <USelectMenu
                        id="audio-language"
                        v-model="language"
                        value-key="value"
                        :items="audioLanguageOptions"
                        size="lg"
                        class="w-full"
                    />
                </div>

                <div
                    class="flex items-start gap-2.5 rounded-[10px] bg-(--ui-primary-soft) px-3 py-2.5 text-xs leading-relaxed text-(--ui-primary-strong)"
                >
                    <UIcon
                        name="i-lucide-info"
                        class="mt-0.5 size-4 flex-none"
                    />
                    {{ t("upload.settingsInfo") }}
                </div>

                <UButton
                    size="lg"
                    color="primary"
                    variant="solid"
                    icon="i-lucide-arrow-right"
                    trailing
                    class="w-full justify-center"
                    @click="onNext"
                >
                    {{ t("navigation.new") }}
                </UButton>
            </div>
        </UCard>
    </div>
</template>
