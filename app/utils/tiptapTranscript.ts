import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { StoredSegment } from "~/types/storedSegments";

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
            /** CSS color used by the speaker label element. */
            speakerColor: {
                default: null,
                parseHTML: (element) =>
                    element.style.getPropertyValue("--speaker-color") || null,
                renderHTML: (attributes) =>
                    attributes.speakerColor
                        ? {
                              style: `--speaker-color: ${attributes.speakerColor}`,
                          }
                        : {},
            },
        };
    },

    parseHTML() {
        return [{ tag: "div[data-speaker]" }];
    },

    renderHTML({ node, HTMLAttributes }) {
        /*
            The label is a real element (not a ::before) so it can be clicked
            to open the speaker menu.
        */
        return [
            "div",
            mergeAttributes(HTMLAttributes, { class: "transcript-turn" }),
            [
                "span",
                {
                    class: "transcript-turn-label",
                    contenteditable: "false",
                },
                (node.attrs.speaker as string | null) ?? "",
            ],
            ["p", { class: "transcript-turn-text" }, 0],
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

export function buildTranscriptDocContent(
    segments: StoredSegment[],
    getSpeakerColor: (speaker: string | undefined) => string,
) {
    const turns: { speaker: string | null; segments: StoredSegment[] }[] = [];
    for (const segment of segments) {
        const speaker = segment.speaker ?? null;
        const currentTurn = turns[turns.length - 1];
        if (currentTurn && currentTurn.speaker === speaker) {
            currentTurn.segments.push(segment);
        } else {
            turns.push({ speaker, segments: [segment] });
        }
    }

    return {
        type: "doc",
        content: turns.map((turn) => ({
            type: "speakerTurn",
            attrs: {
                speaker: turn.speaker,
                speakerColor: getSpeakerColor(turn.speaker ?? undefined),
            },
            content: turn.segments.map((segment, index) => {
                // Trailing space joins the merged segments into flowing text.
                const text =
                    index < turn.segments.length - 1
                        ? `${segment.text} `
                        : segment.text;
                return {
                    type: "transcriptSegment",
                    attrs: { segmentId: segment.id },
                    content: text ? [{ type: "text", text }] : undefined,
                };
            }),
        })),
    };
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
                state.doc.descendants((node, pos) => {
                    if (node.type.name !== "transcriptSegment") {
                        return true;
                    }
                    if (node.attrs.segmentId !== playhead.segmentId) {
                        return false;
                    }

                    decorations.push(
                        Decoration.node(pos, pos + node.nodeSize, {
                            class: "transcript-segment--active",
                        }),
                    );

                    const offset = Math.min(
                        Math.max(playhead.charOffset, 0),
                        node.content.size,
                    );
                    decorations.push(
                        Decoration.widget(
                            pos + 1 + offset,
                            () => {
                                const caret = document.createElement("span");
                                caret.className = "transcript-playhead-caret";
                                return caret;
                            },
                            { side: -1 },
                        ),
                    );
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
