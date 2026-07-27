<script setup lang="ts">
import { motion } from "motion-v";
import { TranscriptionNameChangeCommand } from "~/types/commands";
import type { StoredTranscription } from "~/types/storedTranscription";
import { pageTransition, staggerDelay } from "~/utils/animationPresets";

interface InputProps {
    transcription: StoredTranscription;
}

const props = defineProps<InputProps>();

const { t } = useI18n();
const { executeCommand } = useCommandBus();

const isInfoExpanded = ref(false);
const newName = ref(props.transcription.name);

watch(() => props.transcription.name, () => {
    newName.value = props.transcription.name;
});

async function handleNameChange() {
    if (newName.value !== props.transcription.name) {
        await executeCommand(
            new TranscriptionNameChangeCommand(
                props.transcription.id,
                props.transcription.name,
                newName.value,
            ),
        );
    }
}
</script>

<template>
    <motion.div id="transcription-info" :animate="{ opacity: 1, x: 0 }" :initial="{ opacity: 0, x: -10 }"
        :transition="{ ...pageTransition, delay: staggerDelay }">
        <UPopover v-model:open="isInfoExpanded" :ui="{ content: 'p-0 min-w-72' }">
            <UButton id="transcription-info-button" variant="ghost" color="neutral" size="sm" class="gap-1.5">
                <span class="truncate max-w-48 sm:max-w-80 lg:max-w-120 xl:max-w-160 text-[0.9rem] font-semibold text-default">{{
                    props.transcription.name || t("transcription.info")
                }}</span>
                <template #trailing>
                    <UIcon name="i-lucide-chevron-down" class="size-3.5 text-dimmed transition-transform duration-200"
                        :class="{ 'rotate-180': isInfoExpanded }" />
                </template>
            </UButton>

            <template #content>
                <motion.div :animate="{ opacity: 1, y: 0 }" :initial="{ opacity: 0, y: -5 }"
                    :transition="{ duration: 0.2 }"
                    class="p-4 space-y-4 bg-default rounded-lg shadow-xl border border-default">
                    <!-- File Name Input -->
                    <div class="space-y-1.5">
                        <!-- biome-ignore lint/a11y/noLabelWithoutControl: associated via for/id with the UInput below (id forwarded to native input) -->
                        <label for="transcription-name"
                            class="text-xs font-medium text-muted uppercase tracking-wide">
                            {{ t("transcription.nameLabel") }}
                        </label>
                        <UInput id="transcription-name" class="w-full" v-model="newName" @change="handleNameChange"
                            :placeholder="t('transcription.namePlaceholder')" size="sm" />
                    </div>
                </motion.div>
            </template>
        </UPopover>
    </motion.div>
</template>
