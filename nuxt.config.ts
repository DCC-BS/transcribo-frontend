import pwaIcons from './public/icons.json';

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
        'nuxt3-winston-log',
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
    nuxt3WinstonLog: {
        // Maximum size of the file after which it will log
        // This can be a number of bytes, or units of kb, mb, and gb
        // If using the units, add 'k', 'm', or 'g' as the suffix. The units need to directly follow the number
        maxSize: '1024m',

        // Maximum number of logs to keep. If not set, no logs will be removed. This can be a number of files or number of days
        // If using days, add 'd' as the suffix. It uses auditFile to keep track of the log files in a json format
        // It won't delete any file not contained in it. It can be a number of files or number of days
        maxFiles: '14d',

        // Path that info log files will be created in.
        // Change this to keep things neat.
        infoLogPath: `./logs`,
        infoLogName: `%DATE%-${process.env.NODE_ENV}-info.log`,
        errorLogPath: `./logs`,
        errorLogName: `%DATE%-${process.env.NODE_ENV}-error.log`,

        // Set to `true` to skip auto render:html logging (level: info).
        skipRequestMiddlewareHandler: false,
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