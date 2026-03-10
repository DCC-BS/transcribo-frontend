import { liveQuery } from "dexie";
import { db } from "~/stores/db";
import type { StoredSegment } from "~/types/storedSegments";

export function useSegments(transcriptionId: string) {
    const segments = ref<StoredSegment[]>([]);

    const observable = liveQuery(() =>
        db.segments.where("transcriptionId").equals(transcriptionId).toArray(),
    );

    const subscription = observable.subscribe({
        next: (newSegments) => {
            segments.value = newSegments;
        },
    });

    onUnmounted(() => {
        subscription.unsubscribe();
    });

    return {
        segments,
    };
}
