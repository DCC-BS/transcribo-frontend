<script setup lang="ts">
const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

const rate = defineModel<number>({ required: true });

const { t } = useI18n();

/**
 * Advances to the next playback speed, wrapping around.
 */
function cycle(): void {
    const index = SPEED_STEPS.indexOf(
        rate.value as (typeof SPEED_STEPS)[number],
    );
    rate.value = SPEED_STEPS[(index + 1) % SPEED_STEPS.length] ?? 1;
}
</script>

<template>
    <UButton
        variant="ghost"
        color="neutral"
        :label="`${rate}×`"
        class="min-w-9.5 justify-center text-[0.8rem] font-semibold text-muted hover:text-default"
        :title="t('editor.dock.playbackSpeed')"
        @click="cycle"
    />
</template>
