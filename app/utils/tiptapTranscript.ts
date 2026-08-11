import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { canJoin } from "@tiptap/pm/transform";
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

/**
 * Decides whether a speaker turn should start a new paragraph before the next
 * segment: hard-wrapped by length, otherwise at a sentence end or a noticeable
 * pause once the paragraph is long enough.
 *
 * @param paragraphLength - Characters accumulated in the current paragraph.
 * @param lastSegment - Last segment already in the paragraph.
 * @param next - Segment about to be appended.
 * @returns `true` when the paragraph should be broken.
 */
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

/**
 * Builds the ProseMirror document for the transcript editor.
 *
 * @param segments - Segments in playback order.
 * @param displayName - Resolves a speaker id to its display name.
 * @param mergeSegments - Whether consecutive segments of one speaker are
 * merged into shared turns.
 * @returns The document node content.
 */
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

/** The node at `index` extends the preceding segment, else the following one
 *  — typing after a segment continues that segment. `follows` marks the
 *  latter case, where the id-less node comes first and so survives the join. */
function adjacentSegmentNode(
    turn: ProseMirrorNode,
    index: number,
): { node: ProseMirrorNode; follows: boolean } | null {
    const previous = index > 0 ? turn.child(index - 1) : null;
    if (previous?.attrs.segmentId) {
        return { node: previous, follows: false };
    }
    const next = index + 1 < turn.childCount ? turn.child(index + 1) : null;
    return next?.attrs.segmentId ? { node: next, follows: true } : null;
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
 * Adopting such a node costs one attribute write; text and caret stay put.
 * The adopted node is then joined back into the sibling it belongs to, so the
 * document keeps exactly one node per stored segment — the invariant the
 * karaoke decorations (which measure word offsets per node) and the editor's
 * sync check both rely on.
 */
export function createSegmentOwnershipPlugin(): Plugin {
    return new Plugin({
        appendTransaction(transactions, _oldState, newState) {
            if (!transactions.some((transaction) => transaction.docChanged)) {
                return null;
            }

            const { tr } = newState;
            // Boundaries between two nodes of one segment, in document order.
            const boundaries: number[] = [];
            let previousParent: ProseMirrorNode | null = null;
            let previousIndex = -1;
            let previousId: string | null = null;

            newState.doc.descendants((node, pos, parent, index) => {
                if (node.type.name !== "transcriptSegment") {
                    return true;
                }
                let segmentId = node.attrs.segmentId as string | null;
                if (!segmentId && parent) {
                    const source = adjacentSegmentNode(parent, index);
                    segmentId =
                        (source?.node.attrs.segmentId as string) ?? null;
                    if (source && segmentId) {
                        /*
                            The join below keeps the attrs of whichever node
                            comes first. When the adopted node is the one in
                            front, it has to carry its source's paragraph
                            break over — otherwise typing into an empty
                            segment that opens a paragraph silently closes
                            the blank line before it.
                        */
                        tr.setNodeMarkup(pos, undefined, {
                            ...node.attrs,
                            segmentId,
                            ...(source.follows
                                ? {
                                      paragraphBreak:
                                          source.node.attrs.paragraphBreak,
                                  }
                                : {}),
                        });
                    }
                }
                if (
                    segmentId !== null &&
                    segmentId === previousId &&
                    parent === previousParent &&
                    index === previousIndex + 1
                ) {
                    boundaries.push(pos);
                }
                previousParent = parent;
                previousIndex = index;
                previousId = segmentId;
                return false;
            });

            /*
                Attribute writes leave every position untouched, so the
                positions collected above stay valid; joining back to front
                keeps the earlier ones valid too. The caret rides along on the
                transaction's mapping.
            */
            for (const boundary of boundaries.reverse()) {
                if (canJoin(tr.doc, boundary)) {
                    tr.join(boundary);
                }
            }

            return tr.steps.length > 0 ? tr : null;
        },
    });
}

// --- Playhead plugin ---------------------------------------------------

export interface PlayheadSegment {
    segmentId: string;
    /** Interpolated character offset of the playback position. */
    charOffset: number;
}

/**
 * Every segment being spoken right now. Speakers can talk over each other, so
 * this holds one entry per simultaneously live turn — each gets its own
 * current word.
 */
export type PlayheadPosition = PlayheadSegment[];

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
            init: () => [],
            apply: (tr, current) =>
                (tr.getMeta(playheadPluginKey) as PlayheadPosition) ?? current,
        },
        props: {
            decorations(state) {
                const playhead = playheadPluginKey.getState(state);
                if (!playhead?.length) {
                    return DecorationSet.empty;
                }
                const charOffsets = new Map(
                    playhead.map((entry) => [
                        entry.segmentId,
                        entry.charOffset,
                    ]),
                );

                /*
                    With several turns live at once, "already played" means
                    "before the last of them" — so where the played/upcoming
                    split falls has to be known before decorating.
                */
                let lastActivePos = -1;
                state.doc.descendants((node, pos) => {
                    if (node.type.name !== "transcriptSegment") {
                        return true;
                    }
                    if (charOffsets.has(node.attrs.segmentId as string)) {
                        lastActivePos = pos;
                    }
                    return false;
                });

                const decorations: Decoration[] = [];
                state.doc.descendants((node, pos) => {
                    if (node.type.name !== "transcriptSegment") {
                        return true;
                    }

                    const from = pos + 1;
                    const to = pos + 1 + node.content.size;
                    const charOffset = charOffsets.get(
                        node.attrs.segmentId as string,
                    );
                    if (charOffset === undefined) {
                        if (node.content.size > 0) {
                            decorations.push(
                                Decoration.inline(from, to, {
                                    class:
                                        pos > lastActivePos
                                            ? "transcript-w-upcoming"
                                            : "transcript-w-played",
                                }),
                            );
                        }
                        return false;
                    }

                    decorations.push(
                        Decoration.node(pos, pos + node.nodeSize, {
                            class: "transcript-segment--active",
                        }),
                    );

                    // expand the interpolated char offset to word boundaries
                    const text = node.textContent;
                    const { start: wordStart, end: wordEnd } = wordBoundsAt(
                        text,
                        charOffset,
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

/**
 * Builds inline decorations marking every whole-word occurrence of the given
 * vocabulary terms.
 *
 * @param doc - The current document.
 * @param terms - Terms to highlight.
 * @returns The decoration set; empty when there is nothing to highlight.
 */
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

/**
 * ProseMirror plugin highlighting vocabulary terms. The term list is set by
 * dispatching a transaction with {@link keywordPluginKey} metadata.
 *
 * @returns The plugin.
 */
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
