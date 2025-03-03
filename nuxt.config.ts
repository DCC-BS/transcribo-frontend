// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-11-01',
    runtimeConfig: {
        public: {
            apiUrl: process.env.API_URL,
        },
    },
    app: {
        head: {
            titleTemplate: '%s | Transcribo',
            htmlAttrs: {
                lang: 'de',
            },
            meta: [
                { charset: 'utf-8' },
                {
                    name: 'viewport',
                    content: 'width=device-width, initial-scale=1',
                },
                {
                    name: 'apple-mobile-web-app-title',
                    content: 'My Test App',
                },
                { name: 'application-name', content: 'My Test App' },
                { name: 'msapplication-config', content: '/browserconfig.xml' },
            ],
        },
    },
    modules: [
        '@nuxt/ui',
        '@nuxtjs/i18n',
        '@dcc-bs/common-ui.bs.js',
        '@dcc-bs/event-system.bs.js',
        '@nuxt/eslint',
    ],
    devtools: { enabled: true },
    css: ['~/assets/css/main.css'],
    colorMode: {
        preference: 'light',
    },
    // localization
    i18n: {
        locales: ['en', 'de'],
        defaultLocale: 'de',
        vueI18n: './i18n.config.ts',
        lazy: true,
    },
});
