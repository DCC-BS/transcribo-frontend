import type { ICommand } from "#build/types/commands";
import { UpdateSegmentCommand } from "~/types/commands";

interface SegmentWithText {
    id: string;
    text: string;
}

export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildTermPattern(term: string, flags = "i"): RegExp {
    return new RegExp(`(?<!\\w)${escapeRegExp(term.trim())}(?!\\w)`, flags);
}

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

    const pattern = buildTermPattern(from, "g");
    let changed = 0;
    for (const segment of segments) {
        const newText = segment.text.replace(pattern, to);
        if (newText !== segment.text) {
            changed++;
            await executeCommand(
                new UpdateSegmentCommand(segment.id, { text: newText }),
            );
        }
    }
    return changed;
}
