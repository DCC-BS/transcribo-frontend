import eslint from '@eslint/js';
import withNuxt from './.nuxt/eslint.config.mjs';

// Define the new flat config format
export default withNuxt({
    rules: {
    },
}).prepend(eslint.configs.recommended);
