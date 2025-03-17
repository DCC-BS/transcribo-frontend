import pwaIcons from './public/icons.json';
import { fileURLToPath } from 'url';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-11-01',
    alias: {
        '@logger': fileURLToPath(new URL('./services/logger', import.meta.url)),
    },
    build: {
        transpile: [
            './services/logger/winstonLogger.server',
        ]
    },
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
        '@pinia/nuxt',
        '@vite-pwa/nuxt',
    ],
    typescript: {
        strict: true,
    },
    devtools: { enabled: true },
    css: ['~/assets/css/main.css'],
    colorMode: {
        preference: 'light',
    },
    // localization
    i18n: {
        locales: [
            {
                code: 'en',
                name: 'English',
            },
            {
                code: 'de',
                name: 'Deutsch',
            }
        ],
        defaultLocale: 'de',
        vueI18n: './i18n.config.ts',
        lazy: true,
        strategy: 'prefix_except_default',
    },
    pwa: {
        devOptions: {
            enabled: false,
        },
        registerType: 'autoUpdate',
        workbox: {
            globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg}'],
            globIgnores: ['dev-sw-dist/**/*'],
            navigateFallback: '/',
        },
        client: {
            periodicSyncForUpdates: 60 * 10, // 10 minutes
        },
        manifest: {
            name: 'Transcribo BS',
            short_name: 'Transcribo BS',
            description: 'Speech-to-text transcription tool',
            theme_color: '#000000',
            background_color: '#000000',
            icons: pwaIcons.icons as any,
        },
    },
});
