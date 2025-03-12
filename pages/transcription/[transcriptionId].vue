<script lang="ts" setup>
import { UInput } from '#components';
import { TranscriptonNameChangeCommand } from '~/types/commands';

const route = useRoute();
const transcriptionStore = useTranscriptionsStore();
const { executeCommand } = useCommandBus();
const { t } = useI18n();

const transcriptionId = route.params.transcriptionId as string;
const { registerService, unRegisterServer, error, isInited } = useTranscriptionService(transcriptionId);

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
        <UModal fullscreen>
            <UButton label="Help" color="neutral" variant="subtle" />
            <template #content>
                <div class="w-full h-full overflow-scroll">
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