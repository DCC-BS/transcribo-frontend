import { liveQuery, type Subscription } from "dexie";
import { db } from "~/stores/db";
import type { StoredTranscription } from "~/types/storedTranscription";

export function useTranscriptions() {
    const transcriptions = ref<StoredTranscription[]>();
    const logger = useLogger();

    let subscription: Subscription | undefined;

    onMounted(() => {
        const transcriptionObservable = liveQuery(() =>
            db.transcriptions.toArray(),
        );

        subscription = transcriptionObservable.subscribe({
            next: (next) => (transcriptions.value = next),
            error: (error) =>
                logger.error(error, "Error fetching transcriptions:"),
        });
    });

    onUnmounted(() => {
        subscription?.unsubscribe();
    });

    return {
        transcriptions,
    };
}
