import { fileURLToPath } from "node:url";
import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
    test: {
        globals: true,
        environment: "happy-dom",
        setupFiles: ["./tests/setup/vitest-setup.ts"],
        include: ["tests/**/*.test.ts"],
        exclude: ["node_modules", "dist", ".nuxt"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules",
                "tests",
                "**/*.d.ts",
                "**/*.config.*",
                "**/dist/**",
                ".nuxt",
            ],
        },
        testTimeout: 30000,
        hookTimeout: 30000,
    },
    resolve: {
        alias: {
            "~": fileURLToPath(new URL("./app", import.meta.url)),
            "~~": fileURLToPath(new URL(".", import.meta.url)),
        },
    },
});
