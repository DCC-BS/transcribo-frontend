<script lang="ts" setup>
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";
import { UInput } from "#components";
import { MergeSpeakerCommand, SeekToSecondsCommand } from "~/types/commands";
import type { StoredSegment } from "~/types/storedSegments";

interface InputProps {
    transcriptionId: string;
    segments: StoredSegment[];
}

const props = defineProps<InputProps>();

const speakers = computed(() => Array.from(getUniqueSpeakers(props.segments)));
const { executeCommand } = useCommandBus();
const { renameSpeakerEverywhere } = useSpeakerRename(
    () => props.transcriptionId,
    () => props.segments,
);
const { getSpeakerColor } = useSpeakerColor(speakers);

const { t } = useI18n();

const isMobile = useBreakpoints(breakpointsTailwind).smaller("md");
const speakersExpanded = ref(!isMobile.value);

const deleteModalOpen = ref(false);
const speakerToDelete = ref<string | null>(null);
const reassignTarget = ref<string | undefined>(undefined);

const reassignOptions = computed(() => {
    if (!speakerToDelete.value) return [];
    return speakers.value.filter((s) => s !== speakerToDelete.value);
});

async function handleSpeakerNameChange(
    originalName: string,
    newName: string,
): Promise<void> {
    await renameSpeakerEverywhere(originalName, newName);
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
    <UCollapsible
        id="speaker-names-section"
        v-model:open="speakersExpanded"
        class="flex flex-col gap-2"
    >
        <UButton
            variant="link"
            color="neutral"
            :trailing-icon="
                speakersExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
            "
            class="self-start px-0"
        >
            {{ t("common.speakers") }} ({{ speakers.length }})
        </UButton>

        <template #content>
            <div
                class="flex gap-2 flex-wrap pb-2 max-h-48 overflow-y-auto"
            >
            <div
                v-for="(speaker, index) in speakers"
                :key="`existing-${index}`"
                class="flex items-center gap-1"
            >
                <UFieldGroup size="sm">
                    <UInput
                        :model-value="speaker"
                        :style="{ color: getSpeakerColor(speaker) }"
                        :placeholder="t('transcription.placeholderSpeakerName')"
                        class="w-32"
                        @change="
                            (event: Event) =>
                                handleSpeakerNameChange(
                                    speaker,
                                    (event.target as HTMLInputElement).value,
                                )
                        "
                    />
                    <UTooltip :text="t('speaker.jumpToFirstAppearance')">
                        <UButton
                            color="neutral"
                            variant="subtle"
                            icon="i-lucide-step-forward"
                            @click="seekToFirstAppearance(speaker)"
                        />
                    </UTooltip>
                    <UTooltip :text="t('speaker.delete')">
                        <UButton
                            color="error"
                            variant="subtle"
                            icon="i-lucide-trash-2"
                            :disabled="speakers.length < 2"
                            @mousedown="(e: MouseEvent) => e.preventDefault()"
                            @click="openDeleteModal(speaker)"
                        />
                    </UTooltip>
                </UFieldGroup>
            </div>
            </div>
        </template>
    </UCollapsible>

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
