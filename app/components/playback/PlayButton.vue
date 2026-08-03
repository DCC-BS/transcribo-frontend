<script setup lang="ts">
/*
    Round play/pause button. `contrast` (editor dock) renders text-on-bg
    inverted; `primary` (viewer playbar) renders brand purple.
*/
const props = withDefaults(
    defineProps<{
        playing: boolean;
        tone?: "primary" | "contrast";
    }>(),
    { tone: "primary" },
);

const { t } = useI18n();
</script>

<template>
    <UButton
        id="media-play-button"
        :color="props.tone === 'contrast' ? 'neutral' : 'primary'"
        :icon="props.playing ? 'i-lucide-pause' : 'i-lucide-play'"
        :aria-label="props.playing ? t('media.pause') : t('media.play')"
        class="transform-gpu justify-center rounded-full transition-[transform,background-color] duration-150 ease-out hover:scale-106"
        :class="props.tone === 'contrast' ? 'size-9' : 'size-[38px]'"
        :ui="{ leadingIcon: 'size-4' }"
    />
</template>
