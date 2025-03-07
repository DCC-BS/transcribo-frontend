export const useResizeObserver = (container: Ref<HTMLDivElement | undefined>) => {
    let observer = (entry: ResizeObserverEntry) => { };

    const resizeObserver = ref<ResizeObserver>();

    onMounted(() => {
        if (!container.value) return;

        // Create a new ResizeObserver instance
        resizeObserver.value = new ResizeObserver((entries) => {
            for (const entry of entries) {
                observer(entry);
            }
        });

        // Start observing the container element
        resizeObserver.value.observe(container.value);
    });

    onUnmounted(() => {
        if (resizeObserver.value) {
            resizeObserver.value.disconnect();
        }
    });

    function observe(callback: (entry: ResizeObserverEntry) => void) {
        observer = callback;
    }

    return { observe, resizeObserver };
}
