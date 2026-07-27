<script lang="ts" setup>
import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor, EditorContent } from "@tiptap/vue-3";
import {
    onClickOutside,
    useDebounceFn,
    useEventListener,
    useStyleTag,
} from "@vueuse/core";
import {
    AddSegmentCommand,
    DeleteSegmentCommand,
    DeleteSegmentsCommand,
    InsertSegmentCommand,
    RenameSpeakerCommand,
    SeekToSecondsCommand,
    UpdateSegmentsCommand,
} from "~/types/commands";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import type { Keyword } from "~/types/transcriptionResponse";
import { replaceTermInSegmentTexts } from "~/utils/segmentTextReplace";
import {
    buildTranscriptDocContent,
    buildTranscriptTurns,
    createKeywordHighlightPlugin,
    createPlayheadPlugin,
    createSegmentOwnershipPlugin,
    keywordPluginKey,
    playheadPluginKey,
    SpeakerTurnNode,
    TranscriptDocNode,
    TranscriptSegmentNode,
    TranscriptTextNode,
} from "~/utils/tiptapTranscript";
import { charOffsetAtTime, timeAtCharOffset } from "~/utils/transcriptDoc";
import { planTranscriptEdits } from "~/utils/transcriptEdits";

/*
    Script-style transcript editor: consecutive same-speaker segments flow
    as one editable paragraph under a clickable speaker label. Typing edits
    the text in place with a normal caret; changes sync back to the
    segments (undoable) after a short pause, and edited words are captured
    silently into the vocabulary (edit counter + timestamp in IndexedDB).
    Clicking into the text seeks the player, clicking a speaker label opens
    the speaker menu.
*/
interface TranscriptDocumentEditorProps {
    transcription: StoredTranscription;
    segments: StoredSegment[];
    currentTime: number;
    autoScrollEnabled?: boolean;
    /** Merge consecutive same-speaker segments into one flowing turn. */
    mergeSegments?: boolean;
    /** Show the keyword background highlight (capture stays silent). */
    keywordHighlightEnabled?: boolean;
}

const props = withDefaults(defineProps<TranscriptDocumentEditorProps>(), {
    autoScrollEnabled: true,
    mergeSegments: true,
    keywordHighlightEnabled: false,
});

const { t } = useI18n();
const { executeCommand } = useCommandBus();
const { updateTranscription } = getTranscriptionService();

const editorRoot = ref<HTMLElement>();

const { speakerIds, displayName, speakerColors } = useSpeakerRegistry();

/*
    Speaker colors are applied via CSS rules keyed on the turn's
    data-speaker attribute — never baked into the document. Colors follow
    order changes, renames and added speakers live, without doc rebuilds,
    and always match the lanes exactly.
*/
function escapeAttributeValue(value: string): string {
    return value.replace(/["\\]/g, "\\$&");
}

// Renames change no segment, so no rebuild happens — refresh the turn
// labels' display names in place instead.
watch(
    () => speakerIds.value.map(displayName).join("|"),
    () => {
        const { tr, doc } = editor.state;
        let changed = false;
        doc.descendants((node, pos) => {
            if (node.type.name !== "speakerTurn") {
                return false;
            }
            const name = node.attrs.speaker
                ? displayName(node.attrs.speaker as string)
                : null;
            if (node.attrs.speakerName !== name) {
                tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    speakerName: name,
                });
                changed = true;
            }
            return false;
        });
        if (changed) {
            editor.view.dispatch(tr);
        }
    },
);

useStyleTag(
    computed(() =>
        Object.entries(speakerColors.value)
            .map(
                ([speaker, color]) =>
                    `.transcript-document-editor .transcript-turn[data-speaker="${escapeAttributeValue(speaker)}"] { --speaker-color: ${color}; }`,
            )
            .join("\n"),
    ),
);

const transcriptExtension = Extension.create({
    name: "transcriptBehaviour",
    addProseMirrorPlugins() {
        return [
            createSegmentOwnershipPlugin(),
            createPlayheadPlugin(),
            createKeywordHighlightPlugin(),
        ];
    },
    addKeyboardShortcuts() {
        // Segment texts are single flowing lines — Enter must not split the
        // document structure. Undo/redo belong to the app-wide command
        // history (Ctrl+Z/Y on the window), not to ProseMirror.
        return {
            Enter: () => true,
        };
    },
});

const editor = new Editor({
    extensions: [
        TranscriptDocNode,
        TranscriptTextNode,
        SpeakerTurnNode,
        TranscriptSegmentNode,
        transcriptExtension,
    ],
    content: buildTranscriptDocContent(
        props.segments,
        displayName,
        props.mergeSegments,
    ),
    editorProps: {
        attributes: { class: "transcript-document-content" },
    },
    onUpdate({ transaction }) {
        if (transaction.docChanged) {
            // the transaction's `before` doc is the exact pre-edit state —
            // unlike props.segments it can never lag behind a pending sync
            snapshotCaptureBaseline(transaction.before);
            scheduleTextSync();
        }
    },
});

onUnmounted(() => {
    // A mode switch can tear the editor down before the debounce ran and
    // without a focusout, so the session runs on a doc taken before destroy().
    void finishEditingSession(editor.state.doc);
    editor.destroy();
});

watch(
    [() => props.segments, () => props.mergeSegments],
    async () => {
        if (isDirty || flushPromise) {
            await flushTextEdits();
            await nextTick();
            if (isDirty) {
                return;
            }
        }

        const segments = props.segments;
        // Skip the rebuild when the incoming change is the echo of our own
        // text sync — rebuilding would destroy the caret mid-typing.
        if (docReflectsSegments(segments, props.mergeSegments)) {
            refreshKeywordHighlights();
            return;
        }
        editor.commands.setContent(
            buildTranscriptDocContent(
                segments,
                displayName,
                props.mergeSegments,
            ),
            { emitUpdate: false },
        );
        refreshKeywordHighlights();
        if (pendingFocusSegmentId.value) {
            if (focusSegment(pendingFocusSegmentId.value)) {
                pendingFocusSegmentId.value = null;
            }
        }
    },
    { deep: true },
);

// --- Inline editing: sync doc → segments, capture words silently ------------

let isDirty = false;
let flushPromise: Promise<void> | undefined;

const flushTextEditsDebounced = useDebounceFn(flushTextEdits, 600);

function scheduleTextSync(): void {
    isDirty = true;
    void flushTextEditsDebounced();
}

/**
 * Segment texts as present in the given document (defaults to the current
 * one). A segment can momentarily span several adjacent nodes, so the pieces
 * are concatenated. All but the last segment of a turn carry the join-space
 * appended by the builder; stripping it per segment rather than per node
 * keeps a typed trailing space inside a split segment intact.
 */
function readDocSegmentTexts(
    doc: ProseMirrorNode = editor.state.doc,
): Map<string, string> {
    const texts = new Map<string, string>();
    doc.forEach((turn) => {
        const ids: string[] = [];
        turn.forEach((segmentNode) => {
            const id = segmentNode.attrs.segmentId as string | null;
            if (!id) {
                return;
            }
            const collected = texts.get(id);
            if (collected === undefined) {
                ids.push(id);
            }
            texts.set(id, (collected ?? "") + segmentNode.textContent);
        });
        for (const id of ids.slice(0, -1)) {
            texts.set(id, (texts.get(id) ?? "").replace(/ $/, ""));
        }
    });
    return texts;
}

/** True when the document already mirrors the given segments exactly. */
function docReflectsSegments(
    segments: StoredSegment[],
    mergeSegments: boolean,
): boolean {
    const turns = buildTranscriptTurns(segments, mergeSegments);
    const doc = editor.state.doc;
    if (doc.childCount !== turns.length) {
        return false;
    }
    const docTexts = readDocSegmentTexts();
    let matches = true;
    doc.forEach((turnNode, _offset, turnIndex) => {
        const turn = turns[turnIndex];
        if (
            !turn ||
            (turnNode.attrs.speaker ?? null) !== turn.speaker ||
            turnNode.childCount !== turn.segments.length
        ) {
            matches = false;
            return;
        }
        for (const segment of turn.segments) {
            if (docTexts.get(segment.id) !== segment.text) {
                matches = false;
                return;
            }
        }
    });
    return matches;
}

async function flushTextEdits(doc?: ProseMirrorNode): Promise<void> {
    if (flushPromise) {
        await flushPromise;
        return;
    }

    flushPromise = flushDirtyTextEdits(doc);
    try {
        await flushPromise;
    } finally {
        flushPromise = undefined;
    }
}

async function flushDirtyTextEdits(doc?: ProseMirrorNode): Promise<void> {
    while (isDirty) {
        isDirty = false;
        await persistCurrentTextEdits(doc);
    }
}

async function persistCurrentTextEdits(
    doc: ProseMirrorNode = editor.state.doc,
): Promise<void> {
    const docTexts = readDocSegmentTexts(doc);
    const editingSessionSegmentIds = new Set([
        ...captureBaseline.keys(),
        ...docTexts.keys(),
    ]);
    const { deletedSegmentIds, textUpdates } = planTranscriptEdits(
        props.segments.filter((segment) =>
            editingSessionSegmentIds.has(segment.id),
        ),
        docTexts,
    );

    if (textUpdates.length > 0) {
        await executeCommand(
            new UpdateSegmentsCommand(
                textUpdates.map((update) => ({
                    segmentId: update.segmentId,
                    updates: { text: update.text },
                })),
            ),
        );
    }

    if (deletedSegmentIds.length > 1) {
        await executeCommand(new DeleteSegmentsCommand(deletedSegmentIds));
        return;
    }

    const deletedSegmentId = deletedSegmentIds[0];
    if (deletedSegmentId) {
        await executeCommand(new DeleteSegmentCommand(deletedSegmentId));
    }
}

const captureBaseline = new Map<string, string>();

function snapshotCaptureBaseline(beforeDoc: ProseMirrorNode): void {
    if (captureBaseline.size > 0) {
        return; // session already running — keep the pre-edit state
    }
    for (const [segmentId, text] of readDocSegmentTexts(beforeDoc)) {
        captureBaseline.set(segmentId, text);
    }
}

async function captureFromBaseline(
    doc: ProseMirrorNode = editor.state.doc,
): Promise<void> {
    if (captureBaseline.size === 0) {
        return;
    }
    const docTexts = readDocSegmentTexts(doc);
    const baseline = new Map(captureBaseline);
    captureBaseline.clear();
    for (const [segmentId, oldText] of baseline) {
        const newText = docTexts.get(segmentId);
        if (newText === undefined || newText === oldText) {
            continue;
        }
        await captureEditedWords(segmentId, oldText, newText, docTexts);
    }
}

function onEditorFocusOut(event: FocusEvent): void {
    // focus moved within the editor (e.g. between segments) — not a session
    // end
    const next = event.relatedTarget as Node | null;
    if (next && editorRoot.value?.contains(next)) {
        return;
    }
    finishEditingSession();
}

useEventListener(editorRoot, "focusout", onEditorFocusOut);
onClickOutside(editorRoot, () => finishEditingSession());

/**
 * Focus has left the editor: persist immediately. The VueUse debounce is
 * only a fallback while the user remains in the editor. `doc` defaults to the
 * live document; teardown passes a snapshot taken before `editor.destroy()`.
 */
async function finishEditingSession(doc?: ProseMirrorNode): Promise<void> {
    await flushTextEdits(doc);
    await captureFromBaseline(doc);
}

async function captureEditedWords(
    segmentId: string,
    oldText: string,
    newText: string,
    docTexts: ReadonlyMap<string, string>,
): Promise<void> {
    const edited = diffEditedTerm(oldText, newText);
    if (!edited) {
        return;
    }

    const keyword = findKeyword(edited.replaced);
    if (keyword) {
        await propagateKeywordEdit(
            segmentId,
            oldText,
            docTexts,
            keyword,
            edited.term,
        );
        return;
    }

    await getVocabularyService().rememberTerm(
        edited.term,
        "object",
        "",
        edited.replaced,
    );
}

function normalizeTerm(term: string): string {
    return term.trim().toLocaleLowerCase();
}

function findKeyword(term: string | undefined): Keyword | undefined {
    if (!term) {
        return undefined;
    }
    const normalizedTerm = normalizeTerm(term);
    return props.transcription.keywords?.find(
        (keyword) => normalizeTerm(keyword.term) === normalizedTerm,
    );
}

async function propagateKeywordEdit(
    editedSegmentId: string,
    oldEditedText: string,
    docTexts: ReadonlyMap<string, string>,
    keyword: Keyword,
    newTerm: string,
): Promise<void> {
    const sourceSegments = props.segments.map((segment) => ({
        ...segment,
        text:
            segment.id === editedSegmentId
                ? oldEditedText
                : (docTexts.get(segment.id) ?? segment.text),
    }));

    await replaceTermInSegmentTexts(
        sourceSegments,
        keyword.term,
        newTerm,
        executeCommand,
    );

    const matchingSpeakerId = speakerIds.value.find(
        (speakerId) =>
            normalizeTerm(displayName(speakerId)) ===
            normalizeTerm(keyword.term),
    );
    if (matchingSpeakerId) {
        await executeCommand(
            new RenameSpeakerCommand(
                props.transcription.id,
                matchingSpeakerId,
                displayName(matchingSpeakerId),
                newTerm,
            ),
        );
    }

    const renamedKeywords = (props.transcription.keywords ?? []).map(
        (entry) =>
            normalizeTerm(entry.term) === normalizeTerm(keyword.term)
                ? { ...entry, term: newTerm }
                : entry,
    );
    await updateTranscription(props.transcription.id, {
        keywords: renamedKeywords,
    });

    await getVocabularyService().rememberTerm(
        newTerm,
        keyword.type,
        keyword.description,
        keyword.term,
    );
}

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

const activeSegment = computed(() => {
    for (const turn of buildTranscriptTurns(
        props.segments,
        props.mergeSegments,
    )) {
        const first = turn.segments[0];
        const last = turn.segments[turn.segments.length - 1];
        if (
            !first ||
            !last ||
            props.currentTime < first.start ||
            props.currentTime >= last.end
        ) {
            continue;
        }
        let active = first;
        for (const segment of turn.segments) {
            if (segment.start <= props.currentTime) {
                active = segment;
            }
        }
        return active;
    }
    return undefined;
});

// Scrolling remains stable in silent gaps, but no word is highlighted there.
const scrollAnchorSegment = computed(() => {
    let anchor: (typeof props.segments)[number] | undefined;
    let first: (typeof props.segments)[number] | undefined;
    for (const segment of props.segments) {
        if (!first || segment.start < first.start) {
            first = segment;
        }
        if (
            segment.start <= props.currentTime &&
            (!anchor || segment.start > anchor.start)
        ) {
            anchor = segment;
        }
    }
    return anchor ?? first;
});

function wordStartAt(text: string, offset: number): number {
    let index = Math.min(Math.max(offset, 0), text.length);
    while (index > 0 && !/\s/.test(text[index - 1] ?? " ")) {
        index--;
    }
    return index;
}

let lastPlayheadKey = "";
function applyPlayheadDecorations(): boolean {
    const segment = activeSegment.value;
    const position = segment
        ? {
              segmentId: segment.id,
              charOffset: charOffsetAtTime(segment, props.currentTime),
          }
        : { segmentId: null, charOffset: 0 };
    const key = segment
        ? `${position.segmentId}:${wordStartAt(segment.text, position.charOffset)}`
        : "";
    if (key === lastPlayheadKey) {
        return false;
    }
    lastPlayheadKey = key;
    editor.view.dispatch(editor.state.tr.setMeta(playheadPluginKey, position));
    return true;
}

function syncPlayheadDecorations(): void {
    if (!applyPlayheadDecorations() || !props.autoScrollEnabled) {
        return;
    }
    nextTick(() => centerActiveKaraokeWord("smooth", false));
}

watch(
    () => [activeSegment.value?.id, props.currentTime] as const,
    syncPlayheadDecorations,
);

watch(
    () => scrollAnchorSegment.value?.id,
    (segmentId) => {
        if (!segmentId || !props.autoScrollEnabled) {
            return;
        }
        nextTick(() => centerActiveKaraokeWord("smooth", true));
    },
);

function centerActiveKaraokeWord(
    behavior: ScrollBehavior = "auto",
    force = true,
): void {
    const root = editorRoot.value;
    const scrollContainer = root?.closest<HTMLElement>(
        "[data-transcript-scroll]",
    );
    const active =
        root?.querySelector<HTMLElement>(".transcript-w-current") ??
        (scrollAnchorSegment.value
            ? root?.querySelector<HTMLElement>(
                  `[data-segment-id="${scrollAnchorSegment.value.id}"]`,
              )
            : null);
    if (!scrollContainer || !active) {
        return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const readableTop = containerRect.top + containerRect.height * 0.3;
    const readableBottom = containerRect.bottom - containerRect.height * 0.3;
    if (
        !force &&
        activeRect.top >= readableTop &&
        activeRect.bottom <= readableBottom
    ) {
        return;
    }

    scrollContainer.scrollBy({
        top:
            activeRect.top +
            activeRect.height / 2 -
            (containerRect.top + containerRect.height / 2),
        behavior,
    });
}

onMounted(() => {
    let attempts = 0;
    const tryScroll = () => {
        const word = editorRoot.value?.querySelector<HTMLElement>(
            ".transcript-w-current",
        );
        const anchorId = scrollAnchorSegment.value?.id;
        const anchor = anchorId
            ? editorRoot.value?.querySelector<HTMLElement>(
                  `[data-segment-id="${anchorId}"]`,
              )
            : null;
        const target = word ?? anchor;
        if (
            target &&
            target.getBoundingClientRect().height > 0 &&
            (word || attempts >= 5)
        ) {
            centerActiveKaraokeWord("auto", true);
            return;
        }
        if (++attempts < 30) {
            requestAnimationFrame(tryScroll);
        }
    };
    nextTick(() => {
        applyPlayheadDecorations();
        requestAnimationFrame(tryScroll);
    });
});

function refreshKeywordHighlights(): void {
    // the highlight is a visual layer only — when switched off no terms are
    // decorated; silent capture of edited words is unaffected
    const terms = props.keywordHighlightEnabled
        ? (props.transcription.keywords ?? []).map((entry) => entry.term)
        : [];
    editor.view.dispatch(editor.state.tr.setMeta(keywordPluginKey, terms));
}

watch(
    [() => props.transcription.keywords, () => props.keywordHighlightEnabled],
    refreshKeywordHighlights,
    {
        immediate: true,
        deep: true,
    },
);

// --- Insert segment ---------------------------------------------------------

// Focused once the rebuilt doc contains it, so the new (empty) segment is
// immediately editable — in merged mode it flows inside the existing turn
// and clicking out simply syncs the typed text back like any other edit.
const pendingFocusSegmentId = ref<string | null>(null);

/**
 * Runs a creation command and focuses the segment the handler reports back
 * through its undo command (it leaves an EmptyCommand when there was no room
 * to insert). Callers settle pending typing first, so the rebuild the new
 * segment triggers starts from an already-persisted document.
 */
async function createSegment(
    command: AddSegmentCommand | InsertSegmentCommand,
): Promise<void> {
    await executeCommand(command);
    const undo = command.$undoCommand;
    if (!(undo instanceof DeleteSegmentCommand)) {
        return;
    }
    pendingFocusSegmentId.value = undo.segmentId;
    await nextTick();
    if (focusSegment(undo.segmentId)) {
        pendingFocusSegmentId.value = null;
    }
}

async function insertSegmentAfter(afterId: string): Promise<void> {
    await finishEditingSession();
    // the command handler assigns a unique new speaker and clean timing
    await createSegment(
        new InsertSegmentCommand(props.transcription.id, afterId, {}, "after"),
    );
}

function distanceToSegment(time: number, segment: StoredSegment): number {
    return Math.min(
        Math.abs(time - segment.start),
        Math.abs(time - segment.end),
    );
}

/** Insert at the playhead rather than next to an existing segment. */
async function insertSegmentAt(start: number, end: number): Promise<void> {
    await finishEditingSession();

    const anchor =
        props.segments.find(
            (segment) => start >= segment.start && start < segment.end,
        ) ??
        props.segments.reduce<StoredSegment | undefined>(
            (nearest, segment) =>
                !nearest ||
                distanceToSegment(start, segment) <
                    distanceToSegment(start, nearest)
                    ? segment
                    : nearest,
            undefined,
        );

    await createSegment(
        anchor
            ? new InsertSegmentCommand(
                  props.transcription.id,
                  anchor.id,
                  { start, end },
                  "after",
              )
            : new AddSegmentCommand({
                  transcriptionId: props.transcription.id,
                  start,
                  end,
                  text: "",
              }),
    );
}

defineExpose({ insertSegmentAt });

function focusSegment(segmentId: string): boolean {
    let pos: number | null = null;
    editor.state.doc.descendants((node, nodePos) => {
        if (
            node.type.name === "transcriptSegment" &&
            node.attrs.segmentId === segmentId
        ) {
            pos = nodePos + 1;
            return false;
        }
        return true;
    });
    if (pos !== null) {
        editor.chain().focus().setTextSelection(pos).run();
        return true;
    }
    return false;
}

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

    // start time code: play from the turn's beginning
    const timecode = target?.closest(".transcript-turn-tc[data-seek]");
    if (timecode instanceof HTMLElement && timecode.dataset.seek !== "") {
        executeCommand(
            new SeekToSecondsCommand(Number(timecode.dataset.seek)),
        );
        return;
    }

    // hover divider: insert an empty buffer segment after this turn
    const addseg = target?.closest(".transcript-addseg");
    if (addseg instanceof HTMLElement && addseg.dataset.insertAfter) {
        insertSegmentAfter(addseg.dataset.insertAfter);
        return;
    }

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

// --- Speaker menu ------------------------------------------------------------

interface SpeakerMenuState {
    x: number;
    y: number;
    speaker: string;
    segmentIds: string[];
}

const speakerMenu = ref<SpeakerMenuState | null>(null);

function openSpeakerMenu(event: MouseEvent, label: HTMLElement): void {
    const turn = label.closest(".transcript-turn");
    if (!turn) {
        return;
    }
    const speaker = turn.getAttribute("data-speaker") ?? "";
    const segmentIds = Array.from(turn.querySelectorAll("[data-segment-id]"))
        .map((element) => element.getAttribute("data-segment-id"))
        .filter((id): id is string => !!id);
    // EditorSpeakerMoveMenu is fixed-positioned, so use viewport coordinates
    speakerMenu.value = {
        x: event.clientX,
        y: event.clientY,
        speaker,
        segmentIds,
    };
}

/*
    A speaker already talking within the turn's time span can't take it
    (same-speaker segments must never overlap), so it is greyed out.
*/
function moveDisabledFor(target: string): boolean {
    const menu = speakerMenu.value;
    if (!menu) {
        return false;
    }
    const members = props.segments.filter((segment) =>
        menu.segmentIds.includes(segment.id),
    );
    const start = Math.min(...members.map((segment) => segment.start));
    const end = Math.max(...members.map((segment) => segment.end));
    return props.segments.some(
        (segment) =>
            segment.speaker === target &&
            !menu.segmentIds.includes(segment.id) &&
            segment.start < end &&
            segment.end > start,
    );
}

/*
    Move every segment of the turn to another speaker — one segment in
    unmerged mode, the whole merged run otherwise.
*/
async function changeTurnSpeaker(newSpeaker: string): Promise<void> {
    const menu = speakerMenu.value;
    speakerMenu.value = null;
    if (!menu || newSpeaker === menu.speaker) {
        return;
    }
    // one bulk command so undo reverts the whole turn at once
    await executeCommand(
        new UpdateSegmentsCommand(
            menu.segmentIds.map((segmentId) => ({
                segmentId,
                updates: { speaker: newSpeaker },
            })),
        ),
    );
}

</script>

<template>
    <div ref="editorRoot" class="transcript-document-editor relative">
        <EditorContent :editor="editor" />

        <!-- same popup as the speaker lane's ⋮ menu -->
        <EditorSpeakerMoveMenu
            v-if="speakerMenu"
            :x="speakerMenu.x"
            :y="speakerMenu.y"
            :current-speaker="speakerMenu.speaker"
            :disabled-for="moveDisabledFor"
            @select="changeTurnSpeaker"
            @close="speakerMenu = null"
        />
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
        caret-color: var(--ui-primary);
        white-space: pre-wrap;
    }

    .transcript-turn {
        display: flex;
        gap: 18px;
        margin: 0 0 1.6rem;
    }

    /* layout column; only the name span inside opens the speaker menu */
    .transcript-turn-labelbox {
        display: block;
        width: 128px;
        flex: none;
        padding-top: 2px;
        user-select: none;

        &:has(> .transcript-turn-label:empty) {
            display: none;
        }
    }

    .transcript-turn-label {
        display: inline-block;
        max-width: 100%;
        font-weight: 500;
        font-size: 0.84rem;
        color: var(--ui-text-muted);
        cursor: pointer;
        overflow-wrap: anywhere;
        white-space: normal;

        &::before {
            content: "";
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 99px;
            margin-right: 8px;
            background: var(--speaker-color, var(--ui-border));
        }

        &:hover {
            text-decoration: underline;
        }
    }

    .transcript-turn-body {
        flex: 1;
        min-width: 0;
        border-left: 2px solid var(--ui-border);
        padding-left: 22px;
        transition: border-color 0.3s;
    }

    .transcript-turn:has(.transcript-segment--active) .transcript-turn-body {
        border-left-color: var(--speaker-color, var(--ui-primary));
    }

    @media (max-width: 640px) {
        .transcript-turn {
            flex-direction: column;
            gap: 4px;
        }

        .transcript-turn-labelbox {
            width: auto;
            padding-top: 0;
        }

        .transcript-turn-body {
            padding-left: 12px;
        }
    }

    .transcript-turn-tc {
        display: block;
        font-size: 0.72rem;
        color: var(--ui-text-dimmed);
        font-variant-numeric: tabular-nums;
        user-select: none;

        &[data-seek]:not([data-seek=""]) {
            cursor: pointer;
        }

        &:empty {
            display: none;
        }
    }

    .transcript-turn-tc-end {
        margin-top: 4px;
    }

    .transcript-turn-text {
        margin: 3px 0 0;
        font-size: 1.02rem;
        line-height: 1.85;
    }

    .transcript-addseg {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 14px;
        margin: 10px 0 -10px;
        opacity: 0;
        transition: opacity 0.15s;
        user-select: none;

        &::before,
        &::after {
            content: "";
            flex: 1;
            height: 1px;
            background: var(--ui-border);
        }

        &:hover {
            opacity: 1;
        }

        button {
            width: 20px;
            height: 20px;
            border-radius: 99px;
            flex: none;
            background: var(--ui-primary-soft);
            color: var(--ui-primary-strong);
            display: grid;
            place-items: center;
            font-size: 0.85rem;
            font-weight: 700;
            line-height: 1;
            cursor: pointer;

            &:hover {
                background: var(--ui-primary);
                color: #fff;
            }
        }
    }

    .transcript-segment {
        border-radius: 0.25rem;
        transition: background-color 0.3s ease;
        cursor: pointer;
    }

    /* formatting-only paragraph break inside a turn (see
       buildTranscriptTurns) — rendered as a blank line, still one turn
       with a single speaker label */
    .transcript-segment--break::before {
        content: "\A\A";
        white-space: pre;
    }

    /* Karaoke states must never change metrics (font-weight/size/spacing) —
       color + a doubled text-shadow "fake bold" only, so playback never
       reflows the line. */
    .transcript-w-played {
        color: var(--ui-text);
        transition: color 0.2s ease;
    }

    .transcript-w-current {
        color: var(--ui-primary-strong);
        text-shadow:
            0 0 0.35px currentColor,
            0 0 0.35px currentColor;
        transition:
            color 0.2s ease,
            text-shadow 0.2s ease;
    }

    .transcript-w-upcoming {
        color: var(--ui-text-dimmed);
        transition: color 0.2s ease;
    }

    .transcript-keyword {
        background-color: rgba(245, 158, 11, 0.2);
        border-bottom: 1px dotted rgba(245, 158, 11, 0.9);
        border-radius: 0.125rem;
    }
}

</style>
