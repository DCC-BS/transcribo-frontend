import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { StoredSegment } from "~/types/storedSegments";
import { formatTime } from "~/utils/time";
import { wordBoundsAt } from "~/utils/transcriptDoc";

/*
    TipTap building blocks for the read-only script-style transcript viewer:
    speaker turn blocks with a clickable label element, inline segment spans
    (consecutive same-speaker segments merged into one flowing paragraph),
    the playhead decoration plugin and the keyword highlight plugin.
*/

export const TranscriptDocNode = Node.create({
    name: "doc",
    topNode: true,
    content: "speakerTurn+",
});

export const TranscriptTextNode = Node.create({
    name: "text",
    group: "inline",
});

export const SpeakerTurnNode = Node.create({
    name: "speakerTurn",
    group: "block",
    content: "transcriptSegment+",
    defining: true,

    addAttributes() {
        return {
            speaker: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-speaker"),
                renderHTML: (attributes) => ({
                    "data-speaker": attributes.speaker ?? "",
                }),
            },
            /** Display name of the speaker entity; the `speaker` attr is
             *  the stable id. Refreshed by the editor on renames. */
            speakerName: { default: null },
            /** Start of the first and end of the last merged segment — the
             *  turn shows exactly one start and one end time code. */
            startTime: { default: null },
            endTime: { default: null },
            /** Id of the turn's last segment — target for the hover
             *  "insert segment after this turn" divider. */
            lastSegmentId: { default: null },
        };
    },

    parseHTML() {
        return [{ tag: "div[data-speaker]" }];
    },

    renderHTML({ node, HTMLAttributes }) {
        /*
            The label is a real element (not a ::before) so it can be clicked
            to open the speaker menu. One start time code above and one end
            time code below the text — never per merged sub-segment.
        */
        const startTime = node.attrs.startTime as number | null;
        const endTime = node.attrs.endTime as number | null;
        return [
            "div",
            mergeAttributes(HTMLAttributes, { class: "transcript-turn" }),
            [
                "span",
                {
                    class: "transcript-turn-labelbox",
                    contenteditable: "false",
                },
                [
                    "span",
                    {
                        class: "transcript-turn-label",
                        title: (node.attrs.speakerName as string | null) ?? "",
                    },
                    (node.attrs.speakerName as string | null) ?? "",
                ],
            ],
            [
                "div",
                { class: "transcript-turn-body" },
                [
                    "span",
                    {
                        class: "transcript-turn-tc",
                        contenteditable: "false",
                        "data-seek": startTime ?? "",
                    },
                    startTime !== null
                        ? formatTime(startTime, { milliseconds: false })
                        : "",
                ],
                ["p", { class: "transcript-turn-text" }, 0],
                [
                    "span",
                    {
                        class: "transcript-turn-tc transcript-turn-tc-end",
                        contenteditable: "false",
                    },
                    endTime !== null
                        ? formatTime(endTime, { milliseconds: false })
                        : "",
                ],
                [
                    "div",
                    {
                        class: "transcript-addseg",
                        contenteditable: "false",
                        "data-insert-after":
                            (node.attrs.lastSegmentId as string | null) ?? "",
                    },
                    ["button", { type: "button", tabindex: "-1" }, "+"],
                ],
            ],
        ];
    },
});

export const TranscriptSegmentNode = Node.create({
    name: "transcriptSegment",
    group: "inline",
    inline: true,
    content: "text*",

    addAttributes() {
        return {
            segmentId: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-segment-id"),
                renderHTML: (attributes) => ({
                    "data-segment-id": attributes.segmentId ?? "",
                }),
            },
            /** Starts a new paragraph within the turn (formatting only). */
            paragraphBreak: {
                default: false,
                parseHTML: (element) =>
                    element.classList.contains("transcript-segment--break"),
                renderHTML: (attributes) =>
                    attributes.paragraphBreak
                        ? { class: "transcript-segment--break" }
                        : {},
            },
        };
    },

    parseHTML() {
        return [{ tag: "span[data-segment-id]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(HTMLAttributes, { class: "transcript-segment" }),
            0,
        ];
    },
});

export interface TranscriptTurn {
    speaker: string | null;
    segments: StoredSegment[];
    /** Indices of segments that start a new paragraph within the turn. */
    paragraphBreaks: Set<number>;
}

/*
    Formatting-only paragraph breaks inside overlong same-speaker turns: a
    single speaker talking for minutes would otherwise merge into one wall
    of text. Paragraphs aim for ~6 rendered lines but a finished sentence
    (or a clear pause) matters more than the exact length, so the actual
    size varies. The turn itself stays one block with one speaker label.
*/
const CHARS_PER_LINE = 90; // approximation of both views' line width
const SOFT_SPLIT_CHARS = 5.5 * CHARS_PER_LINE;
const HARD_SPLIT_CHARS = 9 * CHARS_PER_LINE;
const SPLIT_PAUSE_SECONDS = 2.5;
const SENTENCE_END = /[.!?…]["')\]]?$/;

function shouldBreakParagraph(
    paragraphLength: number,
    lastSegment: StoredSegment,
    next: StoredSegment,
): boolean {
    if (paragraphLength >= HARD_SPLIT_CHARS) {
        return true;
    }
    if (paragraphLength < SOFT_SPLIT_CHARS) {
        return false;
    }
    return (
        SENTENCE_END.test(lastSegment.text.trimEnd()) ||
        next.start - lastSegment.end >= SPLIT_PAUSE_SECONDS
    );
}

/** Group segments into speaker turns — the doc structure of the editor. */
export function buildTranscriptTurns(
    segments: StoredSegment[],
    mergeSegments = true,
): TranscriptTurn[] {
    const turns: TranscriptTurn[] = [];
    let paragraphLength = 0;
    for (const segment of segments) {
        const speaker = segment.speaker ?? null;
        const currentTurn = turns[turns.length - 1];
        const lastSegment = currentTurn?.segments.at(-1);
        if (mergeSegments && currentTurn && currentTurn.speaker === speaker) {
            if (
                lastSegment &&
                shouldBreakParagraph(paragraphLength, lastSegment, segment)
            ) {
                currentTurn.paragraphBreaks.add(currentTurn.segments.length);
                paragraphLength = segment.text.length;
            } else {
                paragraphLength += segment.text.length + 1;
            }
            currentTurn.segments.push(segment);
        } else {
            turns.push({
                speaker,
                segments: [segment],
                paragraphBreaks: new Set(),
            });
            paragraphLength = segment.text.length;
        }
    }
    return turns;
}

export function buildTranscriptDocContent(
    segments: StoredSegment[],
    displayName: (speakerId: string | undefined) => string,
    mergeSegments = true,
) {
    const turns = buildTranscriptTurns(segments, mergeSegments);

    return {
        type: "doc",
        content: turns.map((turn) => ({
            type: "speakerTurn",
            attrs: {
                speaker: turn.speaker,
                speakerName: turn.speaker ? displayName(turn.speaker) : null,
                startTime: turn.segments[0]?.start ?? null,
                endTime: turn.segments[turn.segments.length - 1]?.end ?? null,
                lastSegmentId:
                    turn.segments[turn.segments.length - 1]?.id ?? null,
            },
            content: turn.segments.map((segment, index) => {
                // Trailing space joins the merged segments into flowing text.
                const text =
                    index < turn.segments.length - 1
                        ? `${segment.text} `
                        : segment.text;
                return {
                    type: "transcriptSegment",
                    attrs: {
                        segmentId: segment.id,
                        paragraphBreak: turn.paragraphBreaks.has(index),
                    },
                    content: text ? [{ type: "text", text }] : undefined,
                };
            }),
        })),
    };
}

// --- Segment ownership -------------------------------------------------

/** Id of the segment a node at `index` extends: the preceding one, else the
 *  following one — typing after a segment continues that segment. */
function adjacentSegmentId(
    turn: ProseMirrorNode,
    index: number,
): string | null {
    const previous = index > 0 ? turn.child(index - 1) : null;
    const next = index + 1 < turn.childCount ? turn.child(index + 1) : null;
    return (
        (previous?.attrs.segmentId as string | null) ??
        (next?.attrs.segmentId as string | null) ??
        null
    );
}

/**
 * Enforces the invariant that every `transcriptSegment` names the stored
 * segment it belongs to.
 *
 * `segmentId` is a foreign key and has no meaningful attribute default, yet
 * ProseMirror creates nodes with defaults on its own: a newly inserted
 * segment is still empty, the caret cannot rest inside an empty inline node
 * and resolves out to the `speakerTurn`, whose `transcriptSegment+` content
 * makes the next keystroke get wrapped in a fresh, id-less segment. Text
 * there belongs to no database row and is dropped by the next rebuild.
 *
 * Adopting such a node costs one attribute write; text and caret stay put
 * and the segment spans two nodes until the next rebuild collapses them.
 */
export function createSegmentOwnershipPlugin(): Plugin {
    return new Plugin({
        appendTransaction(transactions, _oldState, newState) {
            if (!transactions.some((transaction) => transaction.docChanged)) {
                return null;
            }

            const { tr } = newState;
            newState.doc.descendants((node, pos, parent, index) => {
                if (node.type.name !== "transcriptSegment") {
                    return true;
                }
                if (node.attrs.segmentId || !parent) {
                    return false;
                }
                const segmentId = adjacentSegmentId(parent, index);
                if (segmentId) {
                    tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        segmentId,
                    });
                }
                return false;
            });

            return tr.steps.length > 0 ? tr : null;
        },
    });
}

// --- Playhead plugin ---------------------------------------------------

export interface PlayheadPosition {
    segmentId: string | null;
    /** Interpolated character offset of the playback position. */
    charOffset: number;
}

export const playheadPluginKey = new PluginKey<PlayheadPosition>(
    "transcriptPlayhead",
);

/*
    Karaoke word states: everything
    before the playback position keeps the full text color, the word at the
    position gets the primary color with a text-shadow fake-bold (no metric
    change, so nothing reflows), everything after is dimmed. Kept cheap by
    decorating whole ranges — only the current word is word-level, so the
    set stays at O(#segments) decorations per update.
*/
export function createPlayheadPlugin(): Plugin<PlayheadPosition> {
    return new Plugin<PlayheadPosition>({
        key: playheadPluginKey,
        state: {
            init: () => ({ segmentId: null, charOffset: 0 }),
            apply: (tr, current) =>
                (tr.getMeta(playheadPluginKey) as PlayheadPosition) ?? current,
        },
        props: {
            decorations(state) {
                const playhead = playheadPluginKey.getState(state);
                if (!playhead?.segmentId) {
                    return DecorationSet.empty;
                }

                const decorations: Decoration[] = [];
                let reachedActive = false;
                state.doc.descendants((node, pos) => {
                    if (node.type.name !== "transcriptSegment") {
                        return true;
                    }

                    const from = pos + 1;
                    const to = pos + 1 + node.content.size;
                    if (node.attrs.segmentId !== playhead.segmentId) {
                        if (node.content.size > 0) {
                            decorations.push(
                                Decoration.inline(from, to, {
                                    class: reachedActive
                                        ? "transcript-w-upcoming"
                                        : "transcript-w-played",
                                }),
                            );
                        }
                        return false;
                    }

                    reachedActive = true;
                    decorations.push(
                        Decoration.node(pos, pos + node.nodeSize, {
                            class: "transcript-segment--active",
                        }),
                    );

                    // expand the interpolated char offset to word boundaries
                    const text = node.textContent;
                    const { start: wordStart, end: wordEnd } = wordBoundsAt(
                        text,
                        playhead.charOffset,
                    );

                    if (wordStart > 0) {
                        decorations.push(
                            Decoration.inline(from, from + wordStart, {
                                class: "transcript-w-played",
                            }),
                        );
                    }
                    if (wordEnd > wordStart) {
                        decorations.push(
                            Decoration.inline(
                                from + wordStart,
                                from + wordEnd,
                                {
                                    class: "transcript-w-current",
                                },
                            ),
                        );
                    }
                    if (wordEnd < text.length) {
                        decorations.push(
                            Decoration.inline(from + wordEnd, to, {
                                class: "transcript-w-upcoming",
                            }),
                        );
                    }
                    return false;
                });
                return DecorationSet.create(state.doc, decorations);
            },
        },
    });
}

// --- Keyword highlight plugin -------------------------------------------

export const keywordPluginKey = new PluginKey<string[]>("transcriptKeywords");

function buildKeywordDecorations(
    doc: ProseMirrorNode,
    terms: string[],
): DecorationSet {
    if (terms.length === 0) {
        return DecorationSet.empty;
    }

    const patterns = terms
        .map((term) => term.trim())
        .filter((term) => term.length > 0)
        .map((term) => ({ term, pattern: buildTermPattern(term, "gi") }));

    const decorations: Decoration[] = [];
    doc.descendants((node, pos) => {
        if (node.type.name !== "transcriptSegment") {
            return true;
        }
        const text = node.textContent;
        for (const { term, pattern } of patterns) {
            pattern.lastIndex = 0;
            for (const match of text.matchAll(pattern)) {
                if (match.index === undefined) {
                    continue;
                }
                decorations.push(
                    Decoration.inline(
                        pos + 1 + match.index,
                        pos + 1 + match.index + match[0].length,
                        {
                            class: "transcript-keyword",
                            "data-term": term,
                        },
                    ),
                );
            }
        }
        return false;
    });
    return DecorationSet.create(doc, decorations);
}

export function createKeywordHighlightPlugin(): Plugin {
    return new Plugin({
        key: keywordPluginKey,
        state: {
            init: () => [] as string[],
            apply: (tr, current: string[]) =>
                (tr.getMeta(keywordPluginKey) as string[]) ?? current,
        },
        props: {
            decorations(state) {
                const terms = keywordPluginKey.getState(state) ?? [];
                return buildKeywordDecorations(state.doc, terms);
            },
        },
    });
}
