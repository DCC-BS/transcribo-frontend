import eslint from '@eslint/js';
import withNuxt from './.nuxt/eslint.config.mjs';

// Import necessary plugins and configs
import prettierPlugin from 'eslint-plugin-prettier';

// Define the new flat config format
export default withNuxt({
    plugins: {
        prettier: prettierPlugin,
    },
    rules: {
        'prettier/prettier': 'error',
        // ... other Prettier rules
    },
}).prepend(eslint.configs.recommended);
