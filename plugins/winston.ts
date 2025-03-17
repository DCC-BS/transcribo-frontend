export default defineNuxtPlugin(async (nuxtApp) => {
    const logger = await getNewLogger();
    nuxtApp.provide('logger', logger);
});
