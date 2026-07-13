<script lang="ts" setup>
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";
import { SeekToSecondsCommand } from "~/types/commands";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import type {
    Keyword,
    KeywordType,
} from "~/types/transcriptionResponse";

interface HotWordsViewProps {
    transcription: StoredTranscription;
    segments: StoredSegment[];
}

const props = defineProps<HotWordsViewProps>();

const { t } = useI18n();
const { executeCommand } = useCommandBus();
const { updateTranscription } = getTranscriptionService();
const { showToast } = useUserFeedback();

/*
    Names that already appear as speakers are managed in the speaker section,
    so they are hidden here to avoid duplicate, competing rename controls.
    Entries stay in storage (only display is filtered) — `index` refers to the
    full keywords array so renames keep working unchanged.
*/
const speakerNames = computed(
    () =>
        new Set(
            Array.from(getUniqueSpeakers(props.segments)).map((speaker) =>
                speaker.trim().toLowerCase(),
            ),
        ),
);

const wordMappings = computed(() =>
    (props.transcription.keywords ?? [])
        .map((entry, index) => ({
            original: entry.term,
            index,
            // Entries stored before types existed have no type field.
            type: entry.type ?? "object",
        }))
        .filter(
            (mapping) =>
                !speakerNames.value.has(mapping.original.trim().toLowerCase()),
        ),
);

/*
    Sorted into typed sections (person, location, …) so a term is easier to
    find; only non-empty sections are rendered.
*/
const TYPE_ORDER: KeywordType[] = [
    "person",
    "location",
    "institution",
    "object",
];

const groupedMappings = computed(() =>
    TYPE_ORDER.map((type) => ({
        type,
        mappings: wordMappings.value.filter(
            (mapping) => mapping.type === type,
        ),
    })).filter((group) => group.mappings.length > 0),
);

const isMobile = useBreakpoints(breakpointsTailwind).smaller("md");
const isOpen = ref(!isMobile.value);

/*
    A rename is just a spelling change: replace all occurrences in the segment
    texts directly (undoable per segment) — no LLM run needed. Persist the
    rename BEFORE editing segments so the liveQuery re-emission triggered by
    the segment updates already carries the new term.
*/
async function handleWordChange(
    index: number,
    newName: string,
): Promise<void> {
    const keywords: Keyword[] = structuredClone(
        toRaw(props.transcription.keywords) ?? [],
    );
    const entry = keywords[index];
    const trimmed = newName.trim();
    if (!entry || !trimmed || trimmed === entry.term) {
        return;
    }

    const oldTerm = entry.term;
    entry.term = trimmed;
    await updateTranscription(props.transcription.id, { keywords });

    // Learn the confirmed spelling for future transcriptions.
    await getVocabularyService().rememberTerm(
        trimmed,
        entry.type ?? "object",
        entry.description,
    );

    const count = await replaceTermInSegmentTexts(
        props.segments,
        oldTerm,
        trimmed,
        executeCommand,
    );
    showToast(
        t("hotWords.renameSuccess", { term: trimmed, count }),
        "success",
    );
}

/*
    Remembers, per term, which occurrence was jumped to last so that repeated
    clicks cycle through every passage (and wrap around) regardless of the
    current playback position.
*/
const occurrenceCursors = new Map<string, number>();

function jumpToNextOccurrence(term: string): void {
    const pattern = buildTermPattern(term);
    const matches = props.segments
        .filter((segment) => pattern.test(segment.text))
        .sort((a, b) => a.start - b.start);
    if (matches.length === 0) {
        showToast(t("hotWords.noOccurrence"), "info");
        return;
    }

    const next = ((occurrenceCursors.get(term) ?? -1) + 1) % matches.length;
    occurrenceCursors.set(term, next);

    const segment = matches[next];
    if (segment) {
        executeCommand(new SeekToSecondsCommand(segment.start));
    }
}

</script>

<template>
    <UCollapsible v-model:open="isOpen" class="flex flex-col gap-2">
        <UButton
            variant="link"
            color="neutral"
            :trailing-icon="isOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            class="self-start px-0"
        >
            {{ t("hotWords.title") }} ({{ wordMappings.length }})
        </UButton>

        <template #content>
            <div class="flex flex-col gap-2 pb-2">
                <p class="text-xs text-muted">{{ t("hotWords.hint") }}</p>

                <div class="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    <template
                        v-for="group in groupedMappings"
                        :key="group.type"
                    >
                        <span class="text-xs font-semibold">
                            {{ t(`hotWords.type.${group.type}`) }}
                        </span>
                        <div class="flex gap-2 flex-wrap pb-1">
                            <div
                                v-for="mapping in group.mappings"
                                :key="mapping.index"
                                class="flex items-center gap-1"
                            >
                                <UFieldGroup size="sm">
                                    <UInput
                                        :model-value="mapping.original"
                                        class="w-32"
                                        @change="
                                            (event: Event) =>
                                                handleWordChange(
                                                    mapping.index,
                                                    (
                                                        event.target as HTMLInputElement
                                                    ).value,
                                                )
                                        "
                                    />
                                    <UTooltip
                                        :text="
                                            t('hotWords.jumpToNextOccurrence')
                                        "
                                    >
                                        <UButton
                                            color="neutral"
                                            variant="subtle"
                                            icon="i-lucide-step-forward"
                                            :aria-label="
                                                t(
                                                    'hotWords.jumpToNextOccurrence',
                                                )
                                            "
                                            @click="
                                                jumpToNextOccurrence(
                                                    mapping.original,
                                                )
                                            "
                                        />
                                    </UTooltip>
                                </UFieldGroup>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </template>
    </UCollapsible>
</template>
