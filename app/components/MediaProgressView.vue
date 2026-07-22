<script lang="ts" setup>
import { getProgress, type MediaProgress } from "~/types/mediaProgress";

interface InputProps {
    media: File | Blob;
    mediaName: string;
    progressSteps: MediaProgress[];
}

const props = defineProps<InputProps>();

const { t } = useI18n();
</script>

<template>
    <UCard class="mx-auto w-full overflow-hidden shadow-md" :ui="{ body: 'p-0 sm:p-0' }">
        <div
            class="flex items-center gap-3 bg-primary px-4.5 py-3.5 text-(--ui-on-primary)"
        >
            <span
                class="grid size-10 flex-none place-items-center rounded-[11px] bg-white/20 dark:bg-black/15"
            >
                <UIcon
                    :name="
                        isVideoFile(props.media)
                            ? 'i-lucide-video'
                            : 'i-lucide-file-audio'
                    "
                    class="size-5"
                />
            </span>
            <div class="min-w-0 flex-1">
                <p class="truncate text-[0.9rem] font-semibold">
                    {{ props.mediaName }}
                </p>
                <p class="text-xs opacity-85">
                    {{
                        isVideoFile(props.media)
                            ? t("upload.videoFile")
                            : t("upload.audioFile")
                    }}
                    •
                    {{ props.media.type.split("/")[1]?.toUpperCase() }}
                </p>
            </div>
            <span
                class="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium dark:bg-black/15"
            >
                <span
                    class="size-2 animate-pulse rounded-full bg-(--ui-secondary-soft)"
                />
                {{ t("upload.processing") }}
            </span>
        </div>

        <div class="flex flex-col gap-3.5 p-5">
            <!-- identical rows: same icon size, same full-width determinate
                 bar; only color and the trailing state icon change -->
            <div
                v-for="progress in props.progressSteps"
                :key="progress.icon"
                class="flex items-center gap-3"
                :class="{
                    'text-secondary': getProgress(progress) >= 100,
                }"
            >
                <UIcon
                    :name="progress.icon"
                    class="size-5 flex-none"
                    :class="
                        getProgress(progress) >= 100
                            ? 'text-secondary'
                            : 'text-primary'
                    "
                />
                <div class="min-w-0 flex-1">
                    <p class="mb-1 truncate text-sm font-medium">
                        {{ progress.message }}
                    </p>
                    <UProgress
                        :model-value="getProgress(progress)"
                        size="sm"
                        :color="
                            getProgress(progress) >= 100
                                ? 'secondary'
                                : 'primary'
                        "
                    />
                </div>
                <UIcon
                    v-if="getProgress(progress) < 100"
                    name="i-lucide-loader-2"
                    class="size-5 flex-none animate-spin text-secondary"
                />
                <UIcon
                    v-else
                    name="i-lucide-check-circle-2"
                    class="size-5 flex-none text-secondary"
                />
            </div>
        </div>
    </UCard>
</template>
