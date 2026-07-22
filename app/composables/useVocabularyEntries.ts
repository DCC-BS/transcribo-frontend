import { liveQuery, type Subscription } from "dexie";
import { db } from "~/stores/db";
import type { StoredVocabularyEntry } from "~/types/storedVocabulary";

/*
    Live list of learned vocabulary entries (alphabetical) for the
    vocabulary settings page; captures from a parallel editing session
    appear immediately.
*/
export function useVocabularyEntries() {
    const entries = ref<StoredVocabularyEntry[]>();
    const logger = useLogger();

    let subscription: Subscription | undefined;

    onMounted(() => {
        const observable = liveQuery(() => db.vocabulary.toArray());
        subscription = observable.subscribe({
            next: (next) =>
                (entries.value = next.sort((a, b) =>
                    a.term.localeCompare(b.term),
                )),
            error: (error) =>
                logger.error(error, "Error fetching vocabulary entries:"),
        });
    });

    onUnmounted(() => {
        subscription?.unsubscribe();
    });

    return { entries };
}
