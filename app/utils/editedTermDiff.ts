/*
    Word-level diff of one completed editing session on a segment text,
    reduced to the single changed region (common word prefix/suffix
    trimmed). Yields the vocabulary capture for that edit:

    - the changed region joined as ONE term — also when a garbled word
      became two or three words ("alskjdfjskd" → "als Beispiel");
    - regions beyond MAX_CAPTURED_WORDS are a rephrasing, not a spelling
      fix, and yield nothing;
    - punctuation-/whitespace-only edits yield nothing;
    - surrounding punctuation is stripped, only real words (≥ 2 chars,
      at least one letter) count.
*/

const MAX_CAPTURED_WORDS = 3;

export interface EditedTerm {
    term: string;
    /** The previous spelling the user renamed away from, if capturable. */
    replaced?: string;
}

export function diffEditedTerm(
    oldText: string,
    newText: string,
): EditedTerm | null {
    const oldWords = oldText.split(/\s+/).filter(Boolean);
    const newWords = newText.split(/\s+/).filter(Boolean);

    let prefix = 0;
    while (
        prefix < oldWords.length &&
        prefix < newWords.length &&
        oldWords[prefix] === newWords[prefix]
    ) {
        prefix++;
    }
    let suffix = 0;
    while (
        suffix < oldWords.length - prefix &&
        suffix < newWords.length - prefix &&
        oldWords[oldWords.length - 1 - suffix] ===
            newWords[newWords.length - 1 - suffix]
    ) {
        suffix++;
    }

    const changedOld = oldWords.slice(prefix, oldWords.length - suffix);
    const changedNew = newWords.slice(prefix, newWords.length - suffix);

    if (changedNew.length === 0 || changedNew.length > MAX_CAPTURED_WORDS) {
        return null;
    }

    const term = cleanPhrase(changedNew.join(" "));
    if (!term) {
        return null;
    }
    const replaced =
        changedOld.length > 0 && changedOld.length <= MAX_CAPTURED_WORDS
            ? cleanPhrase(changedOld.join(" "))
            : undefined;

    // punctuation-/whitespace-only edit: the actual words are unchanged,
    // nothing to learn (and no count to bump)
    if (replaced === term) {
        return null;
    }

    return { term, replaced };
}

/** Strip surrounding punctuation; only real content (≥ 2 letters) counts. */
function cleanPhrase(raw: string): string | undefined {
    const phrase = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    return /\p{L}/u.test(phrase) && phrase.length >= 2 ? phrase : undefined;
}
