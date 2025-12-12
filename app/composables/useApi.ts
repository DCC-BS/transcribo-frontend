export function useApi() {
    const { $apiClient } = useNuxtApp();
    return $apiClient;
}
