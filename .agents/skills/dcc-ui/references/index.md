---
skillName: dcc-ui
skillDescription: "Nuxt module of the Kanton Basel-Stadt design system for DCC Basel-Stadt apps: NavigationBar, DataBsFooter, SplitContainer/SplitView, Disclaimer/DisclaimerButton/DisclaimerPage, Changelogs, OnlineStatus, UndoRedoButtons components, the useUserFeedback composable, and the BS color palette. Use when building a DCC/Basel-Stadt Vue/Nuxt frontend or wiring up the common-ui.bs.js module."
---
# User Interface Overview

A comprehensive Nuxt module providing reusable UI components, composables, and utilities built with the official [Kanton Basel-Stadt design system](https://github.com/kanton-basel-stadt/designsystem). This package streamlines development of Basel-Stadt applications by offering a consistent, accessible, and well-documented component library.

See also [GitHub Repository](https://github.com/DCC-BS/common-ui.bs.js).

## Quick Setup

**This package can only be used as a Nuxt module.**

::: tip REMARK
It can be possible to get the components working in a non-Nuxt Vue application, but this is not officially supported and may require additional configuration.

See [Nuxt UI Installation for Vue](https://ui.nuxt.com/docs/getting-started/installation/vue) for how to set up Nuxt UI in a Vue application.

All component can be imported with `import { ComponentName } from '@dcc-bs/common-ui.bs.js/components'` and the composables with `import { composableFunction } from '@dcc-bs/common-ui.bs.js/composables'`.
:::

1. Install the module to your Nuxt application with your preferred package manager:

```sh
# bun
bun add @dcc-bs/common-ui.bs.js

# npm
npm install @dcc-bs/common-ui.bs.js

# pnpm
pnpm add @dcc-bs/common-ui.bs.js

# yarn
yarn add @dcc-bs/common-ui.bs.js
```

2. Add the module to your `nuxt.config.ts`:
```typescript
export default defineNuxtConfig({
  modules: [
    '@dcc-bs/common-ui.bs.js'
  ]
})
```

3. Add the CSS imports to your main css file:
```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@dcc-bs/common-ui.bs.js";
```

That's it! You can now use common-ui.bs.js in your Nuxt app ✨

## Module Features

When using this Nuxt module:
- All components are automatically available globally without imports
- Internationalization (i18n) integration is automatically configured
- Design system assets are automatically included
- Kanton Basel-Stadt color palette is integrated with Tailwind CSS

## Internationalization

All components are fully localized using [@nuxtjs/i18n](https://i18n.nuxtjs.org/). The library provides default translations, but you can override any of them in your application's i18n configuration.

### Available Translation Keys

You can customize the following translation keys in your application:

```json
{
    "common-ui": {
        "undo": "Undo",
        "redo": "Redo",
        "undo_tooltip": "Undo the last action",
        "redo_tooltip": "Redo the last undone action",
        "changelogs": {
            "title": "What's New",
            "close": "Close"
        },
        "health_status": {
            "online_title": "Online",
            "offline_title": "Offline",
            "online_description": "All services are available",
            "offline_description": "Some services are unavailable, features may be limited"
        }
    },
    "disclaimer": {
        "confirmation_text": "I have read and understood...",
        "content": "<h2>Disclaimer and Important Usage..."
    }
}
```

To override these translations, add them to your application's i18n configuration files (e.g., `locales/en.json`, `locales/de.json`, etc.).

## Components
For components see the [Components](./components/) section.

## Composables
For composables see the [Composables](./composables/) section.

## Design System

This library uses the official [Kanton Basel-Stadt design system](https://github.com/kanton-basel-stadt/designsystem) colors, providing a consistent visual identity across all Basel-Stadt applications.

### Available Color Palettes

- **Green**: Primary brand colors (green-50 to green-900)
- **Blue**: Secondary colors (blue-50 to blue-900)  
- **Purple**: Accent colors (purple-50 to purple-900)
- **Red**: Error and warning states (red-50 to red-900)
- **Gray**: Neutral colors (gray-20 to gray-900)
- **Teal**: Supporting colors (teal-50 to teal-900)
- **Yellow**: Highlight colors (yellow-50 to yellow-900)
- **Brown**: Earth tone colors (brown-50 to brown-900)

The color system is fully integrated with Tailwind CSS and can be used with standard Tailwind color classes like `bg-green-500`, `text-blue-600`, etc.

## Additional Resources

- **GitHub Repository**: [DCC-BS/common-ui.bs.js](https://github.com/DCC-BS/common-ui.bs.js)
- **NPM Package**: [@dcc-bs/common-ui.bs.js](https://www.npmjs.com/package/@dcc-bs/common-ui.bs.js)
- **Design System**: [Kanton Basel-Stadt Designsystem](https://github.com/kanton-basel-stadt/designsystem)
- **License**: MIT
