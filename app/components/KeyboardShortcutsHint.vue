<script lang="ts" setup>
import { useMediaQuery } from '@vueuse/core';
import { motion } from "motion-v";

const { t } = useI18n();
const isExpanded = ref(false);
const isMobile = useMediaQuery('(max-width: 768px)');

const shortcuts = computed(() => [
    {
        keys: ['Space'],
        description: t('help.mediaControls.spacebar', { space: 'Space' }).replace('Press ', '').replace(' to play/pause the video or audio', ''),
    },
    {
        keys: ['←', '→'],
        description: '±5s',
    },
    {
        keys: ['Shift', '←/→'],
        description: '±30s',
    },
    {
        keys: ['Ctrl', '←/→'],
        description: '±1s',
    },
    {
        keys: ['Ctrl', 'Z'],
        description: t('navigation.undo'),
    },
    {
        keys: ['Ctrl', 'Y'],
        description: t('navigation.redo'),
    },
]);

function toggleExpand(): void {
    isExpanded.value = !isExpanded.value;
}
</script>

<template>
    <div v-if="!isMobile" class="fixed bottom-6 left-6 z-50">
        <motion.div :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }">
            <div class="bg-default/80 backdrop-blur-sm rounded-lg shadow-lg border border-default overflow-hidden">
                <button class="flex items-center gap-2 px-3 py-2 w-full hover:bg-accented/50 transition-colors text-sm"
                    @click="toggleExpand">
                    <UIcon name="i-lucide-keyboard" class="w-4 h-4" />
                    <span class="font-medium">{{ t('help.help') }}</span>
                    <UIcon :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                        class="w-4 h-4 ml-auto" />
                </button>

                <motion.div :initial="false" :animate="{
                    height: isExpanded ? 'auto' : 0,
                    opacity: isExpanded ? 1 : 0,
                }" :transition="{ duration: 0.2 }" class="overflow-hidden">
                    <div class="px-3 pb-3 space-y-1.5 text-xs">
                        <div v-for="(shortcut, index) in shortcuts" :key="index"
                            class="flex items-center justify-between gap-4 py-1">
                            <div class="flex items-center gap-1">
                                <kbd v-for="(key, keyIndex) in shortcut.keys" :key="keyIndex"
                                    class="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-default">
                                    {{ key }}
                                </kbd>
                            </div>
                            <span class="text-muted">{{ shortcut.description }}</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    </div>
</template>
