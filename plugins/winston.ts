export default defineNuxtPlugin((nuxtApp) => {
    // if client side, do nothing
    if (import.meta.client) {
        return;
    }

    nuxtApp.provide('logger', getNewLogger());
});
