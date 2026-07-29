import type { ICommand } from "#build/types/commands";
import { UpdateSegmentsCommand } from "~/types/commands";

interface SegmentWithText {
    id: string;
    text: string;
}

/**
 * Escapes regular-expression metacharacters in a literal string.
 *
 * @param value - Raw user input.
 * @returns The input safe for embedding in a `RegExp` source.
 */
export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a whole-word pattern for a vocabulary term.
 *
 * @param term - The term to match.
 * @param flags - Regular-expression flags; case-insensitive by default.
 * @returns A pattern matching the term only at word boundaries.
 */
export function buildTermPattern(term: string, flags = "i"): RegExp {
    return new RegExp(`(?<!\\w)${escapeRegExp(term.trim())}(?!\\w)`, flags);
}

/**
 * Replaces every whole-word occurrence of a term across the given segments,
 * as a single undoable command.
 *
 * @param segments - Segments to search.
 * @param oldTerm - Spelling to replace.
 * @param newTerm - Replacement spelling.
 * @param executeCommand - Command executor providing undo/redo.
 * @returns How many segments were changed; `0` when nothing matched or the
 * terms are empty or equal.
 */
export async function replaceTermInSegmentTexts(
    segments: SegmentWithText[],
    oldTerm: string,
    newTerm: string,
    executeCommand: (command: ICommand) => Promise<void>,
): Promise<number> {
    const from = oldTerm.trim();
    const to = newTerm.trim();
    if (!from || !to || from === to) {
        return 0;
    }

    const pattern = buildTermPattern(from, "gi");
    const entries: ConstructorParameters<typeof UpdateSegmentsCommand>[0] = [];
    for (const segment of segments) {
        const newText = segment.text.replace(pattern, to);
        if (newText !== segment.text) {
            entries.push({
                segmentId: segment.id,
                updates: { text: newText },
            });
        }
    }
    if (entries.length > 0) {
        await executeCommand(new UpdateSegmentsCommand(entries));
    }
    return entries.length;
}
