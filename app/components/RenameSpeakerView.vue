<script lang="ts" setup>
import { UInput } from "#components";
import { RenameSpeakerCommand } from "~/types/commands";
import type { StoredTranscription } from "~/types/storedTranscription";

interface InputProps {
    transcription: StoredTranscription;
}

const props = defineProps<InputProps>();

const speakers = computed(() =>
    Array.from(getUniqueSpeakers(props.transcription.segments)),
);
const { executeCommand } = useCommandBus();
const { getSpeakerColor } = useSpeakerColor(speakers);

const { t } = useI18n();

const speakerMappings = ref<{ original: string; new: string }[]>([]);

watch(
    speakers,
    () => {
        speakerMappings.value = speakers.value.map((speaker) => ({
            original: speaker,
            new: speaker,
        }));
    },
    { immediate: true },
);

function handleSpeakerNameChange(originalName: string, newName: string): void {
    if (originalName === newName) {
        return;
    }

    executeCommand(new RenameSpeakerCommand(originalName, newName));
}
</script>

<template>
    <div class="bg-muted/50 rounded-lg p-3">
        <h3 class="text-sm font-semibold mb-2 text-muted-foreground">
            {{ t("common.speakers") }}
        </h3>
        <div class="flex gap-2 flex-wrap">
            <div
                v-for="(speakerMap, index) in speakerMappings"
                :key="index"
            >
                <UInput
                    v-model="speakerMap.new"
                    size="sm"
                    :style="{ color: getSpeakerColor(speakerMap.original) }"
                    :placeholder="t('transcription.placeholderSpeakerName')"
                    class="w-32"
                    @change="handleSpeakerNameChange(speakerMap.original, speakerMap.new)"
                />
            </div>
        </div>
    </div>
</template>
