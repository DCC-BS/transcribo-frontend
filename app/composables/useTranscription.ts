import { liveQuery, type Subscription } from "dexie";
import { db } from "~/stores/db";
import type { StoredTranscription } from "~/types/storedTranscription";

export function useTranscription(id: string) {
    const transcription = ref<StoredTranscription>();
    const logger = useLogger();

    let subscription: Subscription | undefined;

    onMounted(() => {
        const transcriptionObservable = liveQuery(() =>
            db.transcriptions.where("id").equals(id).first(),
        );

        subscription = transcriptionObservable.subscribe({
            next: (next) => (transcription.value = next),
            error: (error) =>
                logger.error(error, "Error fetching transcriptions:"),
        });
    });

    onUnmounted(() => {
        subscription?.unsubscribe();
    });

    return {
        transcription,
    };
}
