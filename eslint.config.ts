import eslint from "@eslint/js";
import withNuxt from "./.nuxt/eslint.config.mjs";

// Define the new flat config format
export default withNuxt({
    rules: {
        indent: ["error", 4], // Enforce 4 spaces for indentation
    },
}).prepend(eslint.configs.recommended);
