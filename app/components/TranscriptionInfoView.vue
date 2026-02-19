<script setup lang="ts">
import { motion } from 'motion-v';
import { TranscriptionNameChangeCommand } from '~/types/commands';
import type { StoredTranscription } from '~/types/storedTranscription';


interface InputProps {
    transcription: StoredTranscription,
}

const props = defineProps<InputProps>();

const { t } = useI18n();
const { executeCommand } = useCommandBus();

const isInfoExpanded = ref(false);

const mediaUrl = computed(() => {
    if (props.transcription.mediaFile) {
        return URL.createObjectURL(
            props.transcription.mediaFile,
        );
    }

    return undefined;
});

const mediaName = computed(() => {
    if (props.transcription.mediaFileName) {
        return props.transcription.mediaFileName;
    }

    return undefined;
});

async function handleNameChange(name: string | number) {
    if (typeof name === "string") {
        await executeCommand(new TranscriptionNameChangeCommand(name));
    }
}
</script>

<template>
    <motion.div :animate="{ opacity: 1, x: 0 }" :initial="{ opacity: 0, x: -10 }"
        :transition="{ ...pageTransition, delay: staggerDelay }">
        <UPopover v-model:open="isInfoExpanded" :ui="{ content: 'p-0 min-w-72' }">
            <UButton variant="ghost" color="neutral" size="sm" class="gap-2">
                <template #leading>
                    <div
                        class="w-6 h-6 rounded-md bg-linear-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-400/20 dark:to-purple-400/20 flex items-center justify-center">
                        <UIcon name="i-lucide-info" class="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    </div>
                </template>
                <span class="truncate max-w-32 sm:max-w-48">{{ props.transcription.name || t('transcription.info')
                    }}</span>
                <template #trailing>
                    <UIcon name="i-lucide-chevron-down" class="w-4 h-4 transition-transform duration-200"
                        :class="{ 'rotate-180': isInfoExpanded }" />
                </template>
            </UButton>

            <template #content>
                <motion.div :animate="{ opacity: 1, y: 0 }" :initial="{ opacity: 0, y: -5 }"
                    :transition="{ duration: 0.2 }"
                    class="p-4 space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                    <!-- File Name Input -->
                    <div class="space-y-1.5">
                        <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {{ t('transcription.nameLabel') || 'Name' }}
                        </label>
                        <UInput class="w-full" :model-value="props.transcription.name"
                            @update:model-value="handleNameChange" :placeholder="t('transcription.namePlaceholder')"
                            size="sm" />
                    </div>

                    <!-- Download Media Button -->
                    <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <a v-if="mediaUrl && mediaName" :href="mediaUrl" :download="mediaName">
                            <motion.div :whileHover="{ scale: 1.02 }" :whileTap="{ scale: 0.98 }"
                                :transition="{ type: 'spring' as const, stiffness: 400, damping: 17 }">
                                <UButton icon="i-lucide-download" variant="soft" :label="t('media.downloadMedia')"
                                    color="info" size="sm" block />
                            </motion.div>
                        </a>
                        <div v-else class="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 italic">
                            <UIcon name="i-lucide-file-x" class="w-4 h-4" />
                            {{ t('media.noMedia') }}
                        </div>
                    </div>
                </motion.div>
            </template>
        </UPopover>
    </motion.div>
</template>
