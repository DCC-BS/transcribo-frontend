import type { H3Event } from "h3";
import { createError } from "h3"; // Import createError from h3
import type { NitroFetchOptions, NitroFetchRequest } from "nitropack";
export type Methods = "get" | "post" | "put" | "delete" | "patch";

// Update the generic type parameters to handle the response type correctly
export async function verboseFetch<T>(
    url: string,
    event: H3Event,
    init?: NitroFetchOptions<NitroFetchRequest, Methods>,
): Promise<T> {
    const logger = getEventLogger(event);

    try {
        // Use type assertion to specify that the return value will be of type T
        // This tells TypeScript that we're handling the conversion from TypedInternalResponse to T
        const response = await $fetch(url, init);
        return response as unknown as T; // NOSONAR
    } catch (error: unknown) {
        // Use unknown as it's safer for caught errors
        // Cast to a more specific type that we expect from $fetch errors
        const fetchError = error as {
            message: string;
            response?: {
                status: number;
                headers: Headers;
            };
            data?: unknown;
        };

        // Create a context object with all available error information
        const errorContext = {
            url,
            method: init?.method ?? "GET",
            errorMessage: fetchError.message,
            status: fetchError.response?.status,
            headers: fetchError.response?.headers
                ? Object.fromEntries(fetchError.response.headers.entries())
                : undefined,
            errorData: fetchError.data,
        };

        // Log all error details in a single structured entry
        logger.error("API request failed", errorContext);

        // Re-throw the error to be handled by Nuxt's error system
        // Provide more specific error messages for common HTTP status codes
        let statusMessage = "Transcription request failed";

        if (fetchError.response?.status === 413) {
            statusMessage = "File too large";
        } else if (fetchError.response?.status === 429) {
            statusMessage = "Too many requests";
        }

        throw createError({
            statusCode: fetchError.response?.status ?? 500,
            statusMessage,
            data: fetchError.data,
        });
    }
}
