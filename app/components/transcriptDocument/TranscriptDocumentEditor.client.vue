<script lang="ts" setup>
import { Extension } from "@tiptap/core";
import { Editor, EditorContent } from "@tiptap/vue-3";
import { onClickOutside, useEventListener } from "@vueuse/core";
import {
    PlayFromSecondsCommand,
    SeekToSecondsCommand,
    UpdateSegmentCommand,
} from "~/types/commands";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import {
    buildTranscriptDocContent,
    createKeywordHighlightPlugin,
    createPlayheadPlugin,
    keywordPluginKey,
    playheadPluginKey,
    SpeakerTurnNode,
    TranscriptDocNode,
    TranscriptSegmentNode,
    TranscriptTextNode,
} from "~/utils/tiptapTranscript";
import { charOffsetAtTime, timeAtCharOffset } from "~/utils/transcriptDoc";

/*
    Read-only script-style transcript viewer: consecutive same-speaker
    segments flow as one paragraph under a clickable speaker label. Clicking
    into the text seeks the player, right-clicking a word offers structured
    edits (this occurrence or everywhere) and keyword actions, clicking a
    speaker label opens the speaker menu. All edits run through the command
    bus, so undo/redo covers them.
*/
interface TranscriptDocumentEditorProps {
    transcription: StoredTranscription;
    segments: StoredSegment[];
    currentTime: number;
    autoScrollEnabled?: boolean;
}

const props = withDefaults(defineProps<TranscriptDocumentEditorProps>(), {
    autoScrollEnabled: true,
});

const { t } = useI18n();
const { executeCommand } = useCommandBus();
const { showToast } = useUserFeedback();
const { isKeyword, renameTerm, addTerm } = useKeywordActions(
    () => props.transcription,
    () => props.segments,
);
const { renameSpeakerEverywhere } = useSpeakerRename(
    () => props.transcription.id,
    () => props.segments,
);

const editorRoot = ref<HTMLElement>();

const speakers = computed(() => Array.from(getUniqueSpeakers(props.segments)));
const { getSpeakerColor } = useSpeakerColor(speakers);

function speakerColorFor(speaker: string | undefined): string {
    return getSpeakerColor(speaker).toString();
}

const decorationsExtension = Extension.create({
    name: "transcriptDecorations",
    addProseMirrorPlugins() {
        return [createPlayheadPlugin(), createKeywordHighlightPlugin()];
    },
});

const editor = new Editor({
    editable: false,
    extensions: [
        TranscriptDocNode,
        TranscriptTextNode,
        SpeakerTurnNode,
        TranscriptSegmentNode,
        decorationsExtension,
    ],
    content: buildTranscriptDocContent(props.segments, speakerColorFor),
    editorProps: {
        attributes: { class: "transcript-document-content" },
    },
});

onUnmounted(() => {
    editor.destroy();
});

watch(
    () => props.segments,
    (segments) => {
        editor.commands.setContent(
            buildTranscriptDocContent(segments, speakerColorFor),
        );
        refreshKeywordHighlights();
    },
    { deep: true },
);

function segmentById(id: string | null): StoredSegment | undefined {
    return id
        ? props.segments.find((segment) => segment.id === id)
        : undefined;
}

/** Segment and text offset under a mouse position, if any. */
function locateSegmentAt(
    event: MouseEvent,
): { segment: StoredSegment; charOffset: number } | null {
    const coords = editor.view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
    });
    if (!coords) {
        return null;
    }

    const resolved = editor.state.doc.resolve(coords.pos);
    for (let depth = resolved.depth; depth > 0; depth--) {
        const node = resolved.node(depth);
        if (node.type.name !== "transcriptSegment") {
            continue;
        }
        const segment = segmentById(node.attrs.segmentId as string | null);
        if (!segment) {
            return null;
        }
        // Clamp away the trailing join-space added between merged segments.
        const charOffset = Math.min(
            Math.max(coords.pos - resolved.start(depth), 0),
            segment.text.length,
        );
        return { segment, charOffset };
    }
    return null;
}

// --- Playback position ----------------------------------------------------

const activeSegment = computed(() =>
    props.segments.find(
        (segment) =>
            props.currentTime >= segment.start &&
            props.currentTime < segment.end,
    ),
);

watch(
    () => [activeSegment.value?.id, props.currentTime] as const,
    () => {
        const segment = activeSegment.value;
        const position = segment
            ? {
                  segmentId: segment.id,
                  charOffset: charOffsetAtTime(segment, props.currentTime),
              }
            : { segmentId: null, charOffset: 0 };
        editor.view.dispatch(
            editor.state.tr.setMeta(playheadPluginKey, position),
        );
    },
);

watch(
    () => activeSegment.value?.id,
    async (segmentId) => {
        if (!segmentId || !props.autoScrollEnabled) {
            return;
        }
        await nextTick();
        editorRoot.value
            ?.querySelector(`[data-segment-id="${segmentId}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
);

// --- Keyword highlighting --------------------------------------------------

function refreshKeywordHighlights(): void {
    const terms = (props.transcription.keywords ?? []).map(
        (entry) => entry.term,
    );
    editor.view.dispatch(editor.state.tr.setMeta(keywordPluginKey, terms));
}

watch(() => props.transcription.keywords, refreshKeywordHighlights, {
    immediate: true,
    deep: true,
});

// --- Click: seek the player / open the speaker menu -------------------------

useEventListener(editorRoot, "click", handleClick);

function handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest(".transcript-document-menu")) {
        return;
    }

    const label = target?.closest(".transcript-turn-label");
    if (label) {
        openSpeakerMenu(event, label as HTMLElement);
        return;
    }
    speakerMenu.value = null;

    // Selecting text must not jump the player around.
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
        return;
    }

    const located = locateSegmentAt(event);
    if (!located) {
        return;
    }
    executeCommand(
        new SeekToSecondsCommand(
            timeAtCharOffset(located.segment, located.charOffset),
        ),
    );
}

// --- Word context menu -------------------------------------------------------

interface ContextMenuState {
    x: number;
    y: number;
    segmentId: string;
    time: number;
    word: string | null;
    wordStart: number | null;
    wordIsKeyword: boolean;
}

const contextMenu = ref<ContextMenuState | null>(null);
const contextMenuElement = ref<HTMLElement>();
const editWordInput = ref("");
const isEditingWord = ref(false);

onClickOutside(contextMenuElement, () => {
    closeContextMenu();
});

function closeContextMenu(): void {
    contextMenu.value = null;
    isEditingWord.value = false;
    editWordInput.value = "";
}

function wordAtOffset(
    text: string,
    offset: number,
): { word: string; index: number } | null {
    const wordPattern = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu;
    for (const match of text.matchAll(wordPattern)) {
        const index = match.index ?? 0;
        if (offset >= index && offset <= index + match[0].length) {
            return { word: match[0], index };
        }
    }
    return null;
}

useEventListener(editorRoot, "contextmenu", handleContextMenu);

function handleContextMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (
        target?.closest(".transcript-turn-label") ||
        target?.closest(".transcript-document-menu")
    ) {
        return;
    }

    const located = locateSegmentAt(event);
    if (!located) {
        return;
    }

    event.preventDefault();

    const wordMatch = wordAtOffset(located.segment.text, located.charOffset);
    const bounds = editorRoot.value?.getBoundingClientRect();

    speakerMenu.value = null;
    isEditingWord.value = false;
    editWordInput.value = wordMatch?.word ?? "";
    contextMenu.value = {
        x: event.clientX - (bounds?.left ?? 0),
        y: event.clientY - (bounds?.top ?? 0),
        segmentId: located.segment.id,
        time: timeAtCharOffset(located.segment, located.charOffset),
        word: wordMatch?.word ?? null,
        wordStart: wordMatch?.index ?? null,
        wordIsKeyword: wordMatch !== null && isKeyword(wordMatch.word),
    };
}

async function playFromHere(): Promise<void> {
    if (!contextMenu.value) {
        return;
    }
    await executeCommand(new PlayFromSecondsCommand(contextMenu.value.time));
    closeContextMenu();
}

async function applyEditWordHere(): Promise<void> {
    const menu = contextMenu.value;
    const replacement = editWordInput.value.trim();
    if (!menu?.word || menu.wordStart === null || !replacement) {
        return;
    }
    const segment = segmentById(menu.segmentId);
    if (!segment) {
        return;
    }
    const newText =
        segment.text.slice(0, menu.wordStart) +
        replacement +
        segment.text.slice(menu.wordStart + menu.word.length);
    await executeCommand(
        new UpdateSegmentCommand(segment.id, { text: newText }),
    );
    closeContextMenu();
}

async function applyEditWordEverywhere(): Promise<void> {
    const menu = contextMenu.value;
    const replacement = editWordInput.value.trim();
    if (!menu?.word || !replacement) {
        return;
    }
    if (menu.wordIsKeyword) {
        // Keyword renames also update the keyword list and the vocabulary.
        await renameTerm(menu.word, replacement);
    } else {
        const count = await replaceTermInSegmentTexts(
            props.segments,
            menu.word,
            replacement,
            executeCommand,
        );
        showToast(
            t("documentEditor.replaceSuccess", { term: replacement, count }),
            "success",
        );
    }
    refreshKeywordHighlights();
    closeContextMenu();
}

async function addWordToKeywords(): Promise<void> {
    const word = contextMenu.value?.word;
    if (!word) {
        return;
    }
    await addTerm(word);
    refreshKeywordHighlights();
    closeContextMenu();
}

// --- Speaker menu ------------------------------------------------------------

interface SpeakerMenuState {
    x: number;
    y: number;
    speaker: string;
    segmentIds: string[];
}

const speakerMenu = ref<SpeakerMenuState | null>(null);
const speakerMenuElement = ref<HTMLElement>();
const speakerSelect = ref<string | undefined>();
const speakerRenameInput = ref("");

onClickOutside(speakerMenuElement, () => {
    speakerMenu.value = null;
});

function openSpeakerMenu(event: MouseEvent, label: HTMLElement): void {
    const turn = label.closest(".transcript-turn");
    if (!turn) {
        return;
    }
    const speaker = turn.getAttribute("data-speaker") ?? "";
    const segmentIds = Array.from(turn.querySelectorAll("[data-segment-id]"))
        .map((element) => element.getAttribute("data-segment-id"))
        .filter((id): id is string => !!id);
    const bounds = editorRoot.value?.getBoundingClientRect();

    closeContextMenu();
    speakerSelect.value = speaker;
    speakerRenameInput.value = speaker;
    speakerMenu.value = {
        x: event.clientX - (bounds?.left ?? 0),
        y: event.clientY - (bounds?.top ?? 0),
        speaker,
        segmentIds,
    };
}

/** Assign an existing or freshly created speaker to this turn only. */
async function changeTurnSpeaker(newSpeaker: string): Promise<void> {
    const menu = speakerMenu.value;
    const name = newSpeaker.trim();
    if (!menu || !name || name === menu.speaker) {
        return;
    }
    for (const segmentId of menu.segmentIds) {
        await executeCommand(
            new UpdateSegmentCommand(segmentId, { speaker: name }),
        );
    }
    speakerMenu.value = null;
}

async function confirmRenameSpeaker(): Promise<void> {
    const menu = speakerMenu.value;
    if (!menu) {
        return;
    }
    await renameSpeakerEverywhere(menu.speaker, speakerRenameInput.value);
    speakerMenu.value = null;
}

async function addSpeakerToKeywords(): Promise<void> {
    const speaker = speakerMenu.value?.speaker;
    if (!speaker) {
        return;
    }
    await addTerm(speaker, "person");
    refreshKeywordHighlights();
    speakerMenu.value = null;
}
</script>

<template>
    <div ref="editorRoot" class="transcript-document-editor relative">
        <EditorContent :editor="editor" />

        <!-- Word context menu -->
        <div
            v-if="contextMenu"
            ref="contextMenuElement"
            class="transcript-document-menu absolute z-50 min-w-48"
            :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        >
            <UCard :ui="{ body: 'p-1 sm:p-1' }">
                <template v-if="!isEditingWord">
                    <div class="flex flex-col">
                        <UButton
                            variant="ghost"
                            color="neutral"
                            icon="i-lucide-play"
                            class="justify-start"
                            @click="playFromHere"
                        >
                            {{ t("documentEditor.playFromHere") }}
                        </UButton>
                        <UButton
                            v-if="contextMenu.word"
                            variant="ghost"
                            color="neutral"
                            icon="i-lucide-pen-line"
                            class="justify-start"
                            @click="isEditingWord = true"
                        >
                            {{
                                t("documentEditor.editWord", {
                                    term: contextMenu.word,
                                })
                            }}
                        </UButton>
                        <UButton
                            v-if="contextMenu.word && !contextMenu.wordIsKeyword"
                            variant="ghost"
                            color="neutral"
                            icon="i-lucide-bookmark-plus"
                            class="justify-start"
                            @click="addWordToKeywords"
                        >
                            {{
                                t("documentEditor.addKeyword", {
                                    term: contextMenu.word,
                                })
                            }}
                        </UButton>
                    </div>
                </template>
                <template v-else>
                    <div class="flex flex-col gap-1 p-1">
                        <UInput
                            v-model="editWordInput"
                            size="sm"
                            @keydown.enter="applyEditWordHere"
                            @keydown.escape="closeContextMenu"
                        />
                        <div class="flex gap-1">
                            <UButton
                                size="sm"
                                variant="soft"
                                @click="applyEditWordHere"
                            >
                                {{ t("documentEditor.replaceOne") }}
                            </UButton>
                            <UButton
                                size="sm"
                                variant="soft"
                                @click="applyEditWordEverywhere"
                            >
                                {{ t("documentEditor.replaceAll") }}
                            </UButton>
                        </div>
                    </div>
                </template>
            </UCard>
        </div>

        <!-- Speaker menu -->
        <div
            v-if="speakerMenu"
            ref="speakerMenuElement"
            class="transcript-document-menu absolute z-50 min-w-56"
            :style="{ left: `${speakerMenu.x}px`, top: `${speakerMenu.y}px` }"
        >
            <UCard :ui="{ body: 'p-2 sm:p-2' }">
                <div class="flex flex-col gap-2">
                    <USelectMenu
                        v-model="speakerSelect"
                        :items="speakers"
                        create-item
                        size="sm"
                        :placeholder="t('documentEditor.speakerChange')"
                        @update:model-value="
                            (value: string) => changeTurnSpeaker(value)
                        "
                        @create="changeTurnSpeaker"
                    />
                    <div class="flex gap-1">
                        <UInput
                            v-model="speakerRenameInput"
                            size="sm"
                            @keydown.enter="confirmRenameSpeaker"
                            @keydown.escape="speakerMenu = null"
                        />
                        <UTooltip :text="t('documentEditor.speakerRename')">
                            <UButton
                                size="sm"
                                icon="i-lucide-pen-line"
                                @click="confirmRenameSpeaker"
                            />
                        </UTooltip>
                    </div>
                    <UButton
                        v-if="!isKeyword(speakerMenu.speaker)"
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        icon="i-lucide-bookmark-plus"
                        class="justify-start"
                        @click="addSpeakerToKeywords"
                    >
                        {{
                            t("documentEditor.rememberSpeaker", {
                                name: speakerMenu.speaker,
                            })
                        }}
                    </UButton>
                </div>
            </UCard>
        </div>
    </div>
</template>

<style lang="scss">
/*
    Not scoped: ProseMirror renders the turns and decorations outside Vue's
    template compilation, so scoped attributes would never reach them.
    Everything is namespaced under .transcript-document-editor instead.
*/
.transcript-document-editor {
    .transcript-document-content {
        outline: none;
        padding: 1rem;
        line-height: 1.75;
    }

    .transcript-turn {
        margin: 0 0 1.25rem;
    }

    .transcript-turn-label {
        display: block;
        width: fit-content;
        font-weight: 700;
        font-size: 0.8rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--speaker-color, inherit);
        cursor: pointer;
        user-select: none;

        &:hover {
            text-decoration: underline;
        }

        &:empty {
            display: none;
        }
    }

    .transcript-turn-text {
        margin: 0;
    }

    .transcript-segment {
        border-radius: 0.25rem;
        transition: background-color 0.3s ease;
        cursor: pointer;
    }

    .transcript-segment--active {
        background-color: rgba(20, 184, 166, 0.08);
    }

    .transcript-playhead-caret {
        display: inline-block;
        width: 2px;
        height: 1.15em;
        margin: 0 -1px;
        vertical-align: text-bottom;
        background-color: rgb(20, 184, 166);
        animation: transcript-playhead-blink 1s steps(2, start) infinite;
    }

    .transcript-keyword {
        background-color: rgba(245, 158, 11, 0.2);
        border-bottom: 1px dotted rgba(245, 158, 11, 0.9);
        border-radius: 0.125rem;
    }
}

@keyframes transcript-playhead-blink {
    50% {
        opacity: 0;
    }
}
</style>
