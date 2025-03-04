import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack';
import { createError } from 'h3'; // Import createError from h3
export type Methods = 'get' | 'post' | 'put' | 'delete' | 'patch';

// Update the generic type parameters to handle the response type correctly
export async function verboseFetch<T>(
    url: string,
    init?: NitroFetchOptions<NitroFetchRequest, Methods>,
): Promise<T> {
    try {
        // Use type assertion to specify that the return value will be of type T
        // This tells TypeScript that we're handling the conversion from TypedInternalResponse to T
        return (await $fetch(url, init)) as T;
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

        // Handle errors and attempt to log the error details
        console.error('API request failed:', fetchError.message);

        // If there's a response object available, log additional details
        if (fetchError.response) {
            // Log response status and headers
            console.error('Status:', fetchError.response.status);
            console.error('Headers:', fetchError.response.headers);

            // Get error data if available (this won't try to read the body again)
            if (fetchError.data) {
                console.error('Error data:', fetchError.data);
            }
        }

        // Re-throw the error to be handled by Nuxt's error system
        throw createError({
            statusCode: fetchError.response?.status ?? 500,
            statusMessage: 'Transcription request failed',
            data: fetchError.data,
        });
    }
}
