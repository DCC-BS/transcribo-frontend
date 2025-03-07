export const useCurrentTranscription = () => {
    const store = useTranscriptionsStore();

    const currentTranscription = shallowRef(store.currentTranscription);
    const segments = shallowRef(store.currentTranscription?.segments ?? []);

    const speakers = computed(() =>
        Array.from(getUniqueSpeakers(segments.value)),
    );

    watch(() => store.currentTranscription, () => {
        currentTranscription.value = store.currentTranscription;
        segments.value = store.currentTranscription?.segments ?? [];
    });

    return { currentTranscription, segments, speakers };
}
