import pwaIcons from "./public/icons.json";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2024-11-01",
    runtimeConfig: {
        public: {
            apiUrl: process.env.API_URL,
        },
    },
    nitro: {
        routeRules: {
            "/ffmpeg/**": {
                headers: {
                    "Content-Type": "application/wasm",
                    "Cache-Control": "public, max-age=31536000, immutable",
                },
            },
        },
    },
    $development: {
        vite: {
            server: {
                allowedHosts: ["robust-nationally-lacewing.ngrok-free.app"],
            },
        },
    },
    vite: {
        optimizeDeps: {
            exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
        },
        server: {
            headers: {
                "Cross-Origin-Opener-Policy": "same-origin",
                "Cross-Origin-Embedder-Policy": "require-corp",
            },
            fs: {
                allow: [".."],
            },
        },
        // Configure proper MIME types for WebAssembly files
        build: {
            rollupOptions: {
                external: (id) => id.includes("ffmpeg-core"),
            },
        },
    },
    app: {
        head: {
            titleTemplate: "Transcribo",
            htmlAttrs: {
                lang: "de",
            },
            meta: [
                { charset: "utf-8" },
                {
                    name: "viewport",
                    content: "width=device-width, initial-scale=1",
                },
                {
                    name: "apple-mobile-web-app-title",
                    content: "Transcribo",
                },
                { name: "application-name", content: "Transcribo" },
                { name: "msapplication-config", content: "/browserconfig.xml" },
            ],
        },
    },
    ui: {
        colorMode: false,
    },
    modules: [
        "@nuxt/ui",
        "@nuxtjs/i18n",
        "@dcc-bs/common-ui.bs.js",
        "@dcc-bs/event-system.bs.js",
        "@dcc-bs/logger.bs.js",
        "@dcc-bs/feedback-control.bs.js",
        "@pinia/nuxt",
        "@vite-pwa/nuxt",
    ],
    typescript: {
        strict: true,
    },
    devtools: { enabled: false },
    css: ["~/assets/css/main.css"],
    "feedback-control.bs.js": {
        repo: "Feedback",
        owner: "DCC-BS",
        project: "Transcribo",
        githubToken: process.env.GITHUB_TOKEN,
    },
    // localization
    i18n: {
        locales: [
            {
                code: "en",
                name: "English",
                file: "en.json",
            },
            {
                code: "de",
                name: "Deutsch",
                file: "de.json",
            },
        ],
        defaultLocale: "de",
        strategy: "prefix_except_default",
    },
    pwa: {
        devOptions: {
            enabled: true,
        },
        registerType: "autoUpdate",
        workbox: {
            globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,svg,wasm}"],
            globIgnores: ["dev-sw-dist/**/*"],
            navigateFallback: "/",
            navigateFallbackDenylist: [/^\/transcription\/.*/, /^\/task\/.*/],
            clientsClaim: true,
            skipWaiting: true,
            runtimeCaching: [
                {
                    urlPattern: /\.wasm$/,
                    handler: "CacheFirst",
                    options: {
                        cacheName: "wasm-cache",
                        expiration: {
                            maxEntries: 10,
                            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                        },
                    },
                },
            ],
        },
        client: {
            periodicSyncForUpdates: 60 * 10, // 10 minutes
        },
        manifest: {
            name: "Transcribo BS",
            short_name: "Transcribo BS",
            description: "Speech-to-text transcription tool",
            theme_color: "#000000",
            background_color: "#000000",
            icons: pwaIcons.icons,
        },
    },
});
