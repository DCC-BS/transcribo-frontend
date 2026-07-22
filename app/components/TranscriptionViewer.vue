<script lang="ts" setup>
import { SeekToSecondsCommand } from "~/types/commands";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";
import { formatTime } from "~/utils/time";
import { buildTranscriptTurns } from "~/utils/tiptapTranscript";
import { charOffsetAtTime, timeAtCharOffset } from "~/utils/transcriptDoc";

interface InputProps {
    transcription: StoredTranscription;
    segments: StoredSegment[];
}

const props = defineProps<InputProps>();

// Viewer mode options (persisted)
const showSpeakers = useLocalStorage<boolean>("setting:show-speaker", true);
const showTimestamps = useLocalStorage<boolean>(
    "setting:show-timestamps",
    false,
);
const mergeSegments = useLocalStorage<boolean>("setting:merge-segments", true);

const currentTime = usePlaybackTime();
const { duration } = useMediaDuration(() => props.transcription);

const { getSpeakerColor, displayName } = useSpeakerRegistry();

/**
 * Display block: a single segment or a merged run of consecutive
 * same-speaker segments. `members` keeps every raw segment with its char
 * offset in the combined text, so the karaoke word and click-to-seek
 * interpolate per raw segment rather than over the combined time span.
 */
interface DisplayBlock {
    id: string;
    speaker?: string;
    start: number;
    end: number;
    text: string;
    members: { segment: StoredSegment; offset: number }[];
}

function toDisplayBlock(segment: StoredSegment): DisplayBlock {
    return {
        id: segment.id,
        speaker: segment.speaker ?? undefined,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        members: [{ segment, offset: 0 }],
    };
}

const displayedSegments = computed<DisplayBlock[]>(() => {
    const blocks: DisplayBlock[] = [];
    for (const turn of buildTranscriptTurns(
        props.segments,
        mergeSegments.value,
    )) {
        const first = turn.segments[0];
        if (!first) {
            continue;
        }
        const block = toDisplayBlock(first);
        turn.segments.slice(1).forEach((segment, sliceIndex) => {
            const joiner = turn.paragraphBreaks.has(sliceIndex + 1)
                ? "\n\n"
                : " ";
            block.members.push({
                segment,
                offset: block.text.length + joiner.length,
            });
            block.text = `${block.text}${joiner}${segment.text}`;
            block.end = segment.end;
        });
        blocks.push(block);
    }
    return blocks;
});

function isActive(block: DisplayBlock): boolean {
    return currentTime.value >= block.start && currentTime.value < block.end;
}

// ---- keep the view scrolled to the playback position ------------------

const documentScroller = ref<HTMLElement>();

// last block that has started — stable through the gaps between blocks
const anchorBlockId = computed(() => {
    let anchor: DisplayBlock | undefined;
    for (const block of displayedSegments.value) {
        if (block.start <= currentTime.value) {
            anchor = block;
        }
    }
    return (anchor ?? displayedSegments.value[0])?.id ?? null;
});

function scrollToBlock(id: string | null, smooth: boolean): void {
    if (!id) {
        return;
    }
    documentScroller.value
        ?.querySelector(`[data-block-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({
            behavior: smooth ? "smooth" : "auto",
            block: "center",
        });
}

watch(anchorBlockId, (id) => scrollToBlock(id, true));

// mode switch: land exactly where the playback position is
onMounted(() => {
    nextTick(() => scrollToBlock(anchorBlockId.value, false));
});

// Karaoke word highlight: the word under the playback position gets the
// primary color + fake bold. Interpolated within the raw member segment
// (not the merged span).
const activeWord = computed(() => {
    const block = displayedSegments.value.find((b) => isActive(b));
    if (!block) {
        return null;
    }
    // the last member that has started
    let member = block.members[0];
    for (const m of block.members) {
        if (m.segment.start <= currentTime.value) {
            member = m;
        }
    }
    if (!member) {
        return null;
    }
    const inner = Math.min(
        Math.max(charOffsetAtTime(member.segment, currentTime.value), 0),
        member.segment.text.length,
    );
    const text = block.text;
    const offset = Math.min(member.offset + inner, text.length);
    let start = offset;
    while (start > 0 && !/\s/.test(text[start - 1] ?? " ")) {
        start--;
    }
    let end = offset;
    while (end < text.length && !/\s/.test(text[end] ?? " ")) {
        end++;
    }
    if (end <= start) {
        return null;
    }
    return { block, start, end };
});

function karaokeParts(
    block: DisplayBlock,
): { before: string; word: string; after: string } | null {
    const active = activeWord.value;
    if (!active || active.block !== block) {
        return null;
    }
    return {
        before: block.text.slice(0, active.start),
        word: block.text.slice(active.start, active.end),
        after: block.text.slice(active.end),
    };
}

// Editor-style karaoke staining for whole blocks: everything after the
// playback position is dimmed, everything before keeps the full color.
function blockKaraokeClass(block: DisplayBlock): string {
    if (block.start > currentTime.value) {
        return "viewer-w-upcoming";
    }
    return "";
}

const { t } = useI18n();

const { executeCommand } = useCommandBus();

// Click into the text plays from that word (read-only, no editing):
// map the click to a character offset in the block's text node, then
// interpolate the time. Works for merged blocks too — they carry the
// combined text and time span.
interface CaretHit {
    node: Node;
    offset: number;
}

function caretAtPoint(x: number, y: number): CaretHit | null {
    const doc = document as Document & {
        caretPositionFromPoint?: (
            x: number,
            y: number,
        ) => { offsetNode: Node; offset: number } | null;
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    if (doc.caretPositionFromPoint) {
        const position = doc.caretPositionFromPoint(x, y);
        return position
            ? { node: position.offsetNode, offset: position.offset }
            : null;
    }
    const range = doc.caretRangeFromPoint?.(x, y);
    return range
        ? { node: range.startContainer, offset: range.startOffset }
        : null;
}

function caretLineRect(hit: CaretHit): DOMRect | null {
    if (hit.node.nodeType !== Node.TEXT_NODE) {
        return null;
    }
    const range = document.createRange();
    range.setStart(hit.node, hit.offset);
    range.collapse(true);
    return range.getClientRects()[0] ?? null;
}

function charOffsetFromPoint(event: MouseEvent): number {
    /*
        caretPositionFromPoint snaps to the NEAREST text position — with the
        generous 1.85 line-height a click in the gap between two lines often
        resolves to the end of the line above the pointer. Verify the caret's
        line box actually contains the click's y; if not, probe a few pixels
        downward until it does, so the click lands on the word under (or
        just below) the pointer.
    */
    let hit = caretAtPoint(event.clientX, event.clientY);
    let rect = hit ? caretLineRect(hit) : null;
    if (rect && (event.clientY < rect.top || event.clientY > rect.bottom)) {
        for (const dy of [4, 8, 12, 16]) {
            const probe = caretAtPoint(event.clientX, event.clientY + dy);
            const probeRect = probe ? caretLineRect(probe) : null;
            if (
                probe &&
                probeRect &&
                event.clientY + dy >= probeRect.top &&
                event.clientY + dy <= probeRect.bottom
            ) {
                hit = probe;
                break;
            }
        }
    }
    if (!hit) {
        return 0;
    }

    // Boundary clicks can resolve to the element itself with a child index
    // instead of a text position — descend into the child's first text node.
    let { node, offset } = hit;
    if (node.nodeType === Node.ELEMENT_NODE) {
        const child = node.childNodes[Math.min(offset, node.childNodes.length - 1)];
        if (child) {
            const firstText = document
                .createTreeWalker(child, NodeFilter.SHOW_TEXT)
                .nextNode();
            if (firstText) {
                node = firstText;
                offset = 0;
            }
        }
    }

    // The karaoke highlight splits the paragraph into several text nodes;
    // the caret offset is relative to the hit node, so add everything
    // before it to get the offset within the whole block text.
    const paragraph = event.currentTarget as HTMLElement;
    if (!node || !paragraph.contains(node)) {
        return offset;
    }
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let total = offset;
    for (
        let current = walker.nextNode();
        current && current !== node;
        current = walker.nextNode()
    ) {
        total += current.textContent?.length ?? 0;
    }
    return total;
}

// Jump only — whether it is playing or paused stays as it is. The merged
// offset is mapped back into the raw member segment, the exact inverse of
// the karaoke interpolation.
async function seekFromClick(
    block: DisplayBlock,
    event: MouseEvent,
): Promise<void> {
    if (!props.transcription.mediaFile) {
        return;
    }
    const offset = charOffsetFromPoint(event);
    let member = block.members[0];
    for (const m of block.members) {
        if (m.offset <= offset) {
            member = m;
        }
    }
    if (!member) {
        return;
    }
    await executeCommand(
        new SeekToSecondsCommand(
            timeAtCharOffset(member.segment, offset - member.offset),
        ),
    );
}
</script>

<template>
    <div class="flex min-h-0 grow flex-col">
        <Teleport defer to="#editor-toolbar-tools">
            <UPopover>
                <UButton
                    id="viewer-display-options"
                    icon="i-lucide-settings-2"
                    trailing-icon="i-lucide-chevron-down"
                    color="primary"
                    variant="soft"
                    :title="t('viewer.displayOptions')"
                    class="text-[0.82rem]"
                    :ui="{
                        leadingIcon: 'size-4',
                        trailingIcon: 'hidden size-4 md:block',
                    }"
                >
                    <span class="hidden md:inline">{{
                        t("viewer.displayOptions")
                    }}</span>
                </UButton>
                <template #content>
                    <div class="w-80 flex flex-col gap-3 p-4">
                        <div class="flex items-center justify-between gap-6">
                            <span class="text-sm">{{
                                t("viewer.showSpeakers")
                            }}</span>
                            <USwitch v-model="showSpeakers" />
                        </div>
                        <div class="flex items-center justify-between gap-6">
                            <span class="text-sm">{{
                                t("viewer.showTimestamps")
                            }}</span>
                            <USwitch v-model="showTimestamps" />
                        </div>
                        <div class="flex items-center justify-between gap-6">
                            <span class="text-sm">{{
                                t("viewer.mergeSegments")
                            }}</span>
                            <USwitch v-model="mergeSegments" />
                        </div>
                    </div>
                </template>
            </UPopover>
        </Teleport>

        <!-- document -->
        <div
            ref="documentScroller"
            class="min-h-0 flex-1 overflow-y-auto px-[clamp(20px,6vw,72px)] py-10"
        >
            <div class="mx-auto max-w-200">
                <p
                    v-if="displayedSegments.length === 0"
                    class="text-center text-muted"
                >
                    {{ t("viewer.placeholder") }}
                </p>
                <div
                    v-for="(segment, index) in displayedSegments"
                    :key="segment.id ?? index"
                    :data-block-id="segment.id"
                    class="mb-7"
                >
                    <div
                        v-if="showSpeakers || showTimestamps"
                        class="mb-1.5 flex items-center gap-2 text-[0.84rem] text-muted"
                    >
                        <template v-if="showSpeakers">
                            <span
                                class="size-2.5 flex-none rounded-full"
                                :style="{
                                    background: getSpeakerColor(
                                        segment.speaker ?? 'unknown',
                                    ).toString(),
                                }"
                            />
                            <span
                                class="font-semibold"
                                :class="
                                    isActive(segment)
                                        ? 'text-(--ui-primary-strong)'
                                        : 'text-default'
                                "
                            >
                                {{ displayName(segment.speaker ?? undefined) }}
                            </span>
                        </template>
                        <span
                            v-if="showTimestamps"
                            class="ml-auto text-[0.72rem] tabular-nums text-dimmed"
                        >
                            {{ formatTime(segment.start, { milliseconds: false }) }}
                            –
                            {{ formatTime(segment.end, { milliseconds: false }) }}
                        </span>
                    </div>
                    <!-- biome-ignore lint/a11y/useKeyWithClickEvents: pointer play-from-here, keyboard seeking via playbar -->
                    <p
                        class="whitespace-pre-line text-[1.02rem] leading-[1.85]"
                        :class="[
                            {
                                'cursor-pointer':
                                    props.transcription.mediaFile,
                            },
                            blockKaraokeClass(segment),
                        ]"
                        :title="
                            props.transcription.mediaFile
                                ? t('viewer.playFromHere')
                                : undefined
                        "
                        @click="seekFromClick(segment, $event)"
                    >
                        <template v-if="karaokeParts(segment)">{{
                            karaokeParts(segment)?.before
                        }}<span class="viewer-w-current">{{
                            karaokeParts(segment)?.word
                        }}</span><span class="viewer-w-upcoming">{{
                            karaokeParts(segment)?.after
                        }}</span></template>
                        <template v-else>{{ segment.text }}</template>
                    </p>
                </div>
            </div>
        </div>

        <!-- simple playbar -->
        <MediaPlaybackBar
            v-if="props.transcription.mediaFile"
            v-model="currentTime"
            :transcription="props.transcription"
            :segments="props.segments"
            :duration="duration"
        />
    </div>
</template>

<style scoped>
/* Fake bold via doubled text-shadow — no metric change, so the karaoke
   highlight never reflows the line. */
.viewer-w-current {
    color: var(--ui-primary-strong);
    text-shadow:
        0 0 0.35px currentColor,
        0 0 0.35px currentColor;
    transition: color 0.2s ease;
}

/* not yet played: dimmed */
.viewer-w-upcoming {
    color: var(--ui-text-dimmed);
    transition: color 0.2s ease;
}
</style>
