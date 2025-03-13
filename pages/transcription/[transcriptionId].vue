<script lang="ts" setup>
import { UInput } from '#components';
import { TranscriptonNameChangeCommand } from '~/types/commands';

const route = useRoute();
const transcriptionStore = useTranscriptionsStore();
const { executeCommand } = useCommandBus();
const { t } = useI18n();

const transcriptionId = route.params.transcriptionId as string;
const { registerService, unRegisterServer, error, isInited } = useTranscriptionService(transcriptionId);
const isHelpViewOpen = ref(false);

onMounted(() => {
    registerService();
});

onUnmounted(() => {
    unRegisterServer();
});


async function handleNameChange(name: string | number) {
    if (typeof name === 'string') {
        await executeCommand(new TranscriptonNameChangeCommand(name));
    }
}
</script>

<template>
    <!-- Top container with DisclaimerLlm positioned at the right -->
    <div class="flex justify-end p-2">
        <UModal fullscreen close v-model:open="isHelpViewOpen">
            <UButton icon="i-heroicons-question-mark-circle" variant="ghost" label="Help" color="info" />
            <template #content>
                <div class="flex justify-end p-2">
                    <UButton icon="i-heroicons-x-circle" variant="ghost" label="Close" color="error"
                        @click="isHelpViewOpen = false" />
                </div>
                <div class="overflow-y-scroll w-full h-full">
                    <HelpView />
                </div>
            </template>
        </UModal>
        <DisclaimerLlm />
    </div>

    <div class="p-2" v-if="transcriptionStore.currentTranscription && isInited">
        <div class="flex justify-items-stretch p-2 gap-2">
            <UInput class="grow" :model-value="transcriptionStore.currentTranscription.name"
                @update:model-value="handleNameChange" />
            <ExportToolbar />
        </div>

        <SplitView>
            <template #a>
                <MediaEditor class="sticky" />
            </template>
            <template #b>
                <TranscriptionList class="p-2" />
            </template>
        </SplitView>
    </div>
    <div v-else-if="error" class="p-4 text-center">
        <UAlert color="error" title="Error" :description="t('transcription.notFound')"
            icon="i-heroicons-exclamation-triangle" />
    </div>
    <div v-else class="p-4 text-center">
        <p>{{ t('transcription.loading') }}</p>
    </div>
</template>