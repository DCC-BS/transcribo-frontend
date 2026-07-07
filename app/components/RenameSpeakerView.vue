<script lang="ts" setup>
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";
import { UInput } from "#components";
import type { StoredSegment } from "~/stores/migrations/v4/storedSegments";
import {
    MergeSpeakerCommand,
    RenameSpeakerCommand,
    SeekToSecondsCommand,
} from "~/types/commands";

interface InputProps {
    transcriptionId: string;
    segments: StoredSegment[];
}

const props = defineProps<InputProps>();

const speakers = computed(() => Array.from(getUniqueSpeakers(props.segments)));
const { executeCommand } = useCommandBus();
const { getSpeakerColor } = useSpeakerColor(speakers);

const { t } = useI18n();

const isMobile = useBreakpoints(breakpointsTailwind).smaller("md");
const speakersExpanded = ref(!isMobile.value);

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

const deleteModalOpen = ref(false);
const speakerToDelete = ref<string | null>(null);
const reassignTarget = ref<string | undefined>(undefined);

const reassignOptions = computed(() => {
    if (!speakerToDelete.value) return [];
    return speakers.value.filter((s) => s !== speakerToDelete.value);
});

function handleSpeakerNameChange(originalName: string, newName: string): void {
    if (originalName === newName) {
        return;
    }

    executeCommand(
        new RenameSpeakerCommand(props.transcriptionId, originalName, newName),
    );
}

function seekToFirstAppearance(speaker: string): void {
    const firstSegment = getFirstSegmentOfSpeaker(props.segments, speaker);
    if (firstSegment) {
        executeCommand(new SeekToSecondsCommand(firstSegment.start));
    }
}

function openDeleteModal(speaker: string): void {
    speakerToDelete.value = speaker;
    const options = speakers.value.filter((s) => s !== speaker);
    reassignTarget.value = options.length > 0 ? options[0] : undefined;
    deleteModalOpen.value = true;
}

function confirmDelete(): void {
    if (!speakerToDelete.value || !reassignTarget.value) return;

    executeCommand(
        new MergeSpeakerCommand(
            props.transcriptionId,
            speakerToDelete.value,
            reassignTarget.value,
        ),
    );

    deleteModalOpen.value = false;
    speakerToDelete.value = null;
    reassignTarget.value = undefined;
}

function cancelDelete(): void {
    deleteModalOpen.value = false;
    speakerToDelete.value = null;
    reassignTarget.value = undefined;
}
</script>

<template>
    <div id="speaker-names-section" class="bg-muted/50 rounded-lg p-3">
        <button
            type="button"
            class="w-full flex items-center justify-between"
            @click="speakersExpanded = !speakersExpanded"
        >
            <h3 class="text-sm font-semibold text-muted-foreground">
                {{ t("common.speakers") }} ({{ speakers.length }})
            </h3>
            <UIcon
                name="i-lucide-chevron-down"
                class="size-4 text-muted-foreground transition-transform"
                :class="{ '-rotate-180': speakersExpanded }"
            />
        </button>
        <div v-show="speakersExpanded" class="flex gap-2 flex-wrap mt-2">
            <div
                v-for="(speakerMap, index) in speakerMappings"
                :key="`existing-${index}`"
                class="flex items-center gap-1"
            >
                <UFieldGroup size="sm">
                    <UInput
                        v-model="speakerMap.new"
                        :style="{ color: getSpeakerColor(speakerMap.original) }"
                        :placeholder="t('transcription.placeholderSpeakerName')"
                        class="w-32"
                        @change="
                            handleSpeakerNameChange(
                                speakerMap.original,
                                speakerMap.new,
                            )
                        "
                    />
                    <UTooltip :text="t('speaker.jumpToFirstAppearance')">
                        <UButton
                            color="neutral"
                            variant="subtle"
                            icon="i-lucide-step-forward"
                            @click="seekToFirstAppearance(speakerMap.original)"
                        />
                    </UTooltip>
                    <UTooltip :text="t('speaker.delete')">
                        <UButton
                            color="error"
                            variant="subtle"
                            icon="i-lucide-trash-2"
                            :disabled="speakers.length < 2"
                            @click="openDeleteModal(speakerMap.original)"
                        />
                    </UTooltip>
                </UFieldGroup>
            </div>
        </div>
    </div>

    <UDrawer v-model:open="deleteModalOpen" :title="t('speaker.deleteTitle')">
        <template #body>
            <p class="mb-4">
                {{ t("speaker.deleteMessage", { speaker: speakerToDelete }) }}
            </p>
            <USelect
                v-if="reassignOptions.length > 0"
                v-model="reassignTarget"
                :items="reassignOptions"
                :placeholder="t('speaker.reassignTo')"
            />
        </template>
        <template #footer>
            <div class="flex justify-end gap-2">
                <UButton
                    color="neutral"
                    :label="t('ui.cancel')"
                    @click="cancelDelete"
                />
                <UButton
                    color="error"
                    :label="t('ui.confirm')"
                    :disabled="!reassignTarget"
                    @click="confirmDelete"
                />
            </div>
        </template>
    </UDrawer>
</template>
