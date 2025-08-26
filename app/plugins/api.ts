import { useClientId } from "~/composables/useClientId";

export default defineNuxtPlugin((_) => {
    const api = $fetch.create({
        onRequest({ options }) {
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
