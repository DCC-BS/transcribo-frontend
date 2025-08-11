import { v4 as uuidv4 } from "uuid";

const CLIENT_ID_KEY = "transcribo_client_id";

/**
 * Composable for managing persistent client UUID
 */
export function useClientId() {
    const clientId = ref<string | null>(null);

    /**
     * Initialize or retrieve the client ID from localStorage
     */
    const initializeClientId = (): string => {
        // Check if we're on the client side
        if (typeof window === "undefined") {
            // On server side, generate a temporary ID that will be replaced on client
            return "temp-server-id";
        }

        try {
            // Try to get existing client ID from localStorage
            const existingId = localStorage.getItem(CLIENT_ID_KEY);
            if (existingId) {
                clientId.value = existingId;
                return existingId;
            }

            // Generate new UUID if none exists
            const newId = uuidv4();
            localStorage.setItem(CLIENT_ID_KEY, newId);
            clientId.value = newId;

            return newId;
        } catch (error) {
            // Fallback if localStorage is not available
            if (!clientId.value) {
                clientId.value = uuidv4();
            }
            return clientId.value;
        }
    };

    /**
     * Get the current client ID, initializing if necessary
     */
    const getClientId = (): string => {
        if (!clientId.value) {
            return initializeClientId();
        }
        return clientId.value;
    };

    /**
     * Reset the client ID (generates a new one)
     */
    const resetClientId = (): string => {
        const newId = uuidv4();

        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(CLIENT_ID_KEY, newId);
            } catch (error) {
                console.warn(
                    "Could not save new client ID to localStorage:",
                    error,
                );
            }
        }

        clientId.value = newId;
        return newId;
    };

    // Initialize on creation if on client side
    if (typeof window !== "undefined") {
        initializeClientId();
    }

    return {
        clientId: readonly(clientId),
        getClientId,
        initializeClientId,
        resetClientId,
    };
}
