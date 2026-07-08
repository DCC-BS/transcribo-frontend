import { Extension } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin } from "@tiptap/pm/state";
import type { LowConfidenceRange } from "~/types/storedSegments";
import type { Word } from "~/types/transcriptionResponse";

const LOW_CONFIDENCE_THRESHOLD = 0.5;

const DATA_CONFIDENCE_ATTR = "data-confidence";

export function computeLowConfidenceRanges(
    text: string,
    words: Word[] | null | undefined,
): LowConfidenceRange[] {
    if (!words || words.length === 0) {
        return [];
    }

    const ranges: LowConfidenceRange[] = [];
    let cursor = 0;
    for (const word of words) {
        const token = word.word.trim();
        if (token.length === 0) {
            continue;
        }
        const index = text.indexOf(token, cursor);
        if (index === -1) {
            continue;
        }
        if (word.probability < LOW_CONFIDENCE_THRESHOLD) {
            ranges.push({
                start: index,
                end: index + token.length,
                probability: word.probability,
            });
        }
        cursor = index + token.length;
    }
    return ranges;
}

export function confidenceLabelKey(probability: number): string {
    return probability <= 0.2
        ? "confidence.veryUncertain"
        : "confidence.uncertain";
}

interface ConfidenceTextPart {
    text: string;
    low: boolean;
    probability?: number;
}

function splitByRanges(
    text: string,
    ranges: LowConfidenceRange[],
): ConfidenceTextPart[] {
    const parts: ConfidenceTextPart[] = [];
    let cursor = 0;
    for (const range of ranges) {
        if (
            range.start < cursor ||
            range.end > text.length ||
            range.start >= range.end
        ) {
            continue;
        }
        if (range.start > cursor) {
            parts.push({ text: text.slice(cursor, range.start), low: false });
        }
        parts.push({
            text: text.slice(range.start, range.end),
            low: true,
            probability: range.probability,
        });
        cursor = range.end;
    }
    if (cursor < text.length) {
        parts.push({ text: text.slice(cursor), low: false });
    }
    return parts;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

export function confidenceTextToHtml(
    text: string,
    ranges: LowConfidenceRange[],
): string {
    let currentLine: string[] = [];
    const lines: string[][] = [currentLine];
    for (const part of splitByRanges(text, ranges)) {
        part.text.split("\n").forEach((chunk, index) => {
            if (index > 0) {
                currentLine = [];
                lines.push(currentLine);
            }
            if (chunk.length > 0) {
                if (part.low) {
                    const attr =
                        part.probability == null
                            ? ""
                            : ` ${DATA_CONFIDENCE_ATTR}="${part.probability}"`;
                    currentLine.push(`<u${attr}>${escapeHtml(chunk)}</u>`);
                } else {
                    currentLine.push(escapeHtml(chunk));
                }
            }
        });
    }

    return lines.map((line) => `<p>${line.join("")}</p>`).join("");
}

export function htmlToTextAndRanges(html: string): {
    text: string;
    ranges: LowConfidenceRange[];
} {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const blocks = Array.from(doc.body.children);
    if (blocks.length === 0) {
        return { text: doc.body.textContent ?? "", ranges: [] };
    }

    let text = "";
    const ranges: LowConfidenceRange[] = [];
    blocks.forEach((block, index) => {
        if (index > 0) {
            text += "\n";
        }
        for (const node of Array.from(block.childNodes)) {
            const value = node.textContent ?? "";
            if (node instanceof HTMLElement && node.tagName === "U") {
                const attr = node.getAttribute(DATA_CONFIDENCE_ATTR);
                const parsed = Number(attr);
                ranges.push({
                    start: text.length,
                    end: text.length + value.length,
                    probability:
                        attr !== null && Number.isFinite(parsed)
                            ? parsed
                            : LOW_CONFIDENCE_THRESHOLD,
                });
            }
            text += value;
        }
    });
    return { text, ranges };
}

export function confidenceHighlightStyle(probability: number): string {
    const towardsYellow = Math.min(
        Math.max(probability / LOW_CONFIDENCE_THRESHOLD, 0),
        1,
    );
    const warningShare = Math.round(towardsYellow * 100);
    const color = `color-mix(in oklab, var(--ui-warning) ${warningShare}%, var(--ui-error))`;
    return `background-color: color-mix(in srgb, ${color} 25%, transparent)`;
}

export const ConfidenceProbabilityAttribute = Extension.create({
    name: "confidenceProbability",

    addGlobalAttributes() {
        return [
            {
                types: ["underline"],
                attributes: {
                    probability: {
                        default: null,
                        parseHTML: (element) =>
                            element.getAttribute(DATA_CONFIDENCE_ATTR),
                        renderHTML: (attributes) =>
                            attributes.probability == null
                                ? {}
                                : {
                                      [DATA_CONFIDENCE_ATTR]:
                                          attributes.probability,
                                      style: confidenceHighlightStyle(
                                          Number(attributes.probability),
                                      ),
                                  },
                    },
                },
            },
        ];
    },
});

type DocumentNode = EditorState["doc"];

function findWordBound(
    doc: DocumentNode,
    pos: number,
    direction: -1 | 1,
): number {
    const $pos = doc.resolve(pos);
    if (!$pos.parent.isTextblock) {
        return pos;
    }

    const parentStart = $pos.start();
    const text = doc.textBetween(parentStart, $pos.end(), undefined, " ");
    let offset = pos - parentStart;

    if (direction === -1) {
        while (offset > 0 && !/\s/.test(text.charAt(offset - 1))) {
            offset -= 1;
        }
    } else {
        while (offset < text.length && !/\s/.test(text.charAt(offset))) {
            offset += 1;
        }
    }

    return parentStart + offset;
}

export const ClearConfidenceOnEdit = Extension.create({
    name: "clearConfidenceOnEdit",

    addProseMirrorPlugins() {
        return [
            new Plugin({
                appendTransaction(transactions, _oldState, newState) {
                    const ranges: { from: number; to: number }[] = [];

                    for (const transaction of transactions) {
                        if (!transaction.docChanged) {
                            continue;
                        }
                        for (const range of ranges) {
                            range.from = transaction.mapping.map(
                                range.from,
                                -1,
                            );
                            range.to = transaction.mapping.map(range.to, 1);
                        }
                        for (const step of transaction.steps) {
                            step.getMap().forEach(
                                (_oldFrom, _oldTo, newFrom, newTo) => {
                                    ranges.push({ from: newFrom, to: newTo });
                                },
                            );
                        }
                    }

                    const markType = newState.schema.marks.underline;
                    if (ranges.length === 0 || !markType) {
                        return null;
                    }

                    const tr = newState.tr;
                    for (const { from, to } of ranges) {
                        tr.removeMark(
                            findWordBound(newState.doc, from, -1),
                            findWordBound(newState.doc, to, 1),
                            markType,
                        );
                    }

                    return tr.steps.length > 0 ? tr : null;
                },
            }),
        ];
    },
});
