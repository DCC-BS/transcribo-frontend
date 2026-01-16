import pwaIcons from "./public/icons.json";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2024-11-01",
    routeRules: {
        "/api/ping": {
            cors: true,
            headers: {
                "Cache-Control": "no-store",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers":
                    "Origin, Content-Type, Accept, Authorization, X-Requested-With",
                "Access-Control-Allow-Credentials": "true",
            },
        },
    },
    runtimeConfig: {
        githubToken: process.env.GITHUB_TOKEN,
        apiUrl: process.env.API_URL,
        public: {
            logger_bs: {
                loglevel: process.env.LOG_LEVEL || "debug",
            },
        },
    },
    nitro: {
        routeRules: {
            // Ensure cross-origin isolation in production so ffmpeg.wasm can use SharedArrayBuffer
            "/**": {
                headers: {
                    "Cross-Origin-Opener-Policy": "same-origin",
                    "Cross-Origin-Embedder-Policy": "require-corp",
                    // Restrict embedding to same-origin resources which works for files in /public
                    "Cross-Origin-Resource-Policy": "same-origin",
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
            exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "@vueuse/core"],
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

        worker: {
            format: "es",
        },
        // Configure proper MIME types for WebAssembly files
        build: {
            rollupOptions: {
                external: (id) => id.includes("ffmpeg-core"),
            },
            target: "es2020",
        },
        resolve: {
            alias: {
                dexie: "dexie/dist/dexie.mjs",
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
            link: [
                { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
                {
                    rel: "icon",
                    type: "image/png",
                    sizes: "32x32",
                    href: "/ios/32.png",
                },
                {
                    rel: "icon",
                    type: "image/png",
                    sizes: "16x16",
                    href: "/ios/16.png",
                },
            ],
        },
    },
    ui: {
        colorMode: false,
    },
    icon: {
        // Bundle specific collections server-side to avoid remote Iconify fetches
        serverBundle: {
            collections: ["lucide"],
        },
    },
    // Disable Bunny Fonts provider to avoid external fetches/errors
    fonts: {
        providers: {
            bunny: false,
        },
    },
    modules: [
        "@nuxt/ui",
        "@nuxtjs/i18n",
        "@dcc-bs/common-ui.bs.js",
        "@dcc-bs/event-system.bs.js",
        "@dcc-bs/logger.bs.js",
        "@dcc-bs/feedback-control.bs.js",
        "@dcc-bs/audio-recorder.bs.js",
        "@pinia/nuxt",
        "@vite-pwa/nuxt",
        "@nuxtjs/mdc",
    ],
    typescript: {
        strict: true,
        typeCheck: true,
    },
    devtools: { enabled: true },
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
            enabled: false,
        },
        registerType: "autoUpdate",
        workbox: {
            globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,svg,wasm,ico}"],
            globIgnores: ["dev-sw-dist/**/*"],
            navigateFallback: "/",
            navigateFallbackDenylist: [/^\/transcription\/.*/, /^\/task\/.*/],
            clientsClaim: true,
            skipWaiting: true,
            runtimeCaching: [
                {
                    urlPattern: /\/favicon\.ico$/,
                    handler: "CacheFirst",
                    options: {
                        cacheName: "favicon-cache",
                        expiration: {
                            maxEntries: 1,
                            maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
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
