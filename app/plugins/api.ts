import { useClientId } from "~/composables/useClientId";

export default defineNuxtPlugin((nuxtApp) => {
    const api = $fetch.create({
        onRequest({ request, options, error }) {
            options.headers.set(
                "X-Ephemeral-UUID",
                useClientId().getClientId(),
            );
        },
    });

    return {
        provide: {
            api: api as typeof $fetch,
        },
    };
});
