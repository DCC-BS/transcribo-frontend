<script lang="ts" setup>
import type { AudioRecorder } from "#components";

const emit = defineEmits<(e: "onRecordingComplete", file: Blob) => void>();

const { t } = useI18n();

const { isReady, abandonedRecording, deleteAbandonedRecording, getMp3Blob } =
    useAudioSessions({
        deleteOldSessionsDaysInterval: 30,
        maxSessionsToKeep: 1,
        logger: console.log,
    });

const audioRecorder = ref<typeof AudioRecorder>();
const toast = useToast();
const shouldRecord = ref(false);
const isRecording = ref(false);
const audioBlob = ref<Blob | undefined>(undefined);
const audioUrl = ref<string>();
const userRecording = ref(false);

const lastAbandonedRecording = computed(() => {
    if (abandonedRecording.value && abandonedRecording.value.length > 0) {
        return abandonedRecording.value[abandonedRecording.value.length - 1];
    }
    return null;
});

const lastAbandonedRecordingLocalDate = computed(() => {
    if (lastAbandonedRecording.value) {
        const last = lastAbandonedRecording.value;

        if (last) {
            return new Date(last.createdAt).toLocaleString();
        }
    }

    return null;
});

function onRecordingStopped(file: Blob, _: string) {
    isRecording.value = false;
    audioBlob.value = file;
    userRecording.value = true;
}

function emitAudio(): void {
    if (audioBlob.value) {
        emit("onRecordingComplete", audioBlob.value);
    }
}

async function recover() {
    if (!abandonedRecording.value) return;

    if (lastAbandonedRecording.value) {
        try {
            const blob = await getMp3Blob(lastAbandonedRecording.value.id);
            deleteAbandonedRecording(lastAbandonedRecording.value.id);
            audioBlob.value = blob;
            audioUrl.value = URL.createObjectURL(audioBlob.value);
        } catch (e: unknown) {
            console.error(e);
            const message = e instanceof Error ? e.message : String(e);

            toast.add({
                title: message,
                color: "error",
                icon: "i-lucide-alert-circle",
            });
        }
    }
}
</script>

<template>
    <div class="flex flex-col justify-center items-center">
        <UButton v-if="!shouldRecord" icon="i-lucide-mic" @click="shouldRecord = true">{{
            t("pages.index.recordAudio") }}</UButton>
    </div>
    <div v-if="isReady && shouldRecord">
        <div class="flex flex-col justify-center items-center"
            v-if="!isRecording && abandonedRecording && abandonedRecording.length > 0">
            <p class="mb-2 text-sm text-gray-500">
                {{ t("audio.abandonedRecording", { date: lastAbandonedRecordingLocalDate }) }}
            </p>
            <UButton icon="i-lucide-history" variant="ghost" color="secondary" @click="recover">{{
                t("audio.recover") }}
            </UButton>
        </div>
        <AudioRecorder ref="audioRecorder" :logger="console.log"
            :auto-start="abandonedRecording && abandonedRecording.length === 0" :show-result="true"
            @recording-started="isRecording = true" @recording-stopped="onRecordingStopped" />
        <div v-if="audioUrl && audioBlob && !userRecording" class="flex flex-col justify-center items-center mt-4">
            <audio :src="audioUrl" controls class="mb-4" />
            <UButton @click="emitAudio">{{ t("audioRecorder.useRecording") }}</UButton>
        </div>
    </div>
</template>