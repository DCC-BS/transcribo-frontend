<script lang="ts" setup>
import { TranscriptonNameChangeCommand } from "~/types/commands";
import { UInput } from "#components";

const route = useRoute();
const transcriptionStore = useTranscriptionsStore();
const { executeCommand } = useCommandBus();
const { t } = useI18n();
const mediaUrl = computed(() => {
    if (transcriptionStore.currentTranscription?.mediaFile) {
        return URL.createObjectURL(
            transcriptionStore.currentTranscription?.mediaFile,
        );
    }

    return undefined;
});

const mediaName = computed(() => {
    if (transcriptionStore.currentTranscription?.mediaFileName) {
        return transcriptionStore.currentTranscription?.mediaFileName;
    }

    return undefined;
});

const transcriptionId = route.params.transcriptionId as string;
const { registerService, unRegisterServer, error, isInited } =
    useTranscriptionService(transcriptionId);
const isHelpViewOpen = ref(false);

onMounted(() => {
    registerService();
});

onUnmounted(() => {
    unRegisterServer();
});

async function handleNameChange(name: string | number) {
    if (typeof name === "string") {
        await executeCommand(new TranscriptonNameChangeCommand(name));
    }
}
</script>

<template>
    <div>
        <!-- Top container with DisclaimerLlm positioned at the right -->
        <div class="flex justify-end p-2">
            <a
                v-if="mediaUrl && mediaName"
                :href="mediaUrl"
                :download="mediaName"
            >
                <UButton
                    icon="i-heroicons-arrow-down-tray"
                    variant="ghost"
                    label="Download media"
                    color="info"
                />
            </a>
            <div class="grow" />
            <UModal v-model:open="isHelpViewOpen" fullscreen close>
                <UButton
                    icon="i-heroicons-question-mark-circle"
                    variant="ghost"
                    label="Help"
                    color="info"
                />
                <template #content>
                    <div class="flex justify-end p-2">
                        <UButton
                            icon="i-heroicons-x-circle"
                            variant="ghost"
                            label="Close"
                            color="error"
                            @click="isHelpViewOpen = false"
                        />
                    </div>
                    <div class="overflow-y-scroll w-full h-full">
                        <HelpView />
                    </div>
                </template>
            </UModal>
            <DisclaimerLlm />
        </div>

        <div
            v-if="transcriptionStore.currentTranscription && isInited"
            class="p-2"
        >
            <div class="flex justify-items-stretch p-2 gap-2">
                <UInput
                    class="grow"
                    :model-value="transcriptionStore.currentTranscription.name"
                    @update:model-value="handleNameChange"
                />
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
            <UAlert
                color="error"
                title="Error"
                :description="t('transcription.notFound')"
                icon="i-heroicons-exclamation-triangle"
            />
        </div>
        <div v-else class="p-4 text-center">
            <p>{{ t('transcription.loading') }}</p>
        </div>
    </div>
</template>
