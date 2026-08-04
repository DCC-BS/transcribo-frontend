---
outline: deep
skillParent: dcc-ui
skillName: disclaimer
skillDescription: "Modal Disclaimer Vue component that gatekeeps app access until the user accepts terms; tracks accepted version in localStorage with HTML content. Use when adding a one-time terms/usage-guidelines acceptance gate (not the re-open DisclaimerButton or full-page DisclaimerPage)."
---
<script setup lang="ts">
import { ref } from 'vue';
import DisclaimerExample from '../../../components/DisclaimerExample.vue';

const confirmationText = ref(
    "I have read and understood the instructions and confirm that I will use Test App exclusively in compliance with the stated guidelines.",
);
const appName = ref("Test App");

const contentHtml = ref(`<p>
    By using <strong>Test App</strong>, you acknowledge that you have read and understood the following instructions:
</p>
<ul>
    <li>This application is for authorized use only</li>
    <li>Your data will be processed according to our privacy policy</li>
    <li>You must comply with all applicable laws and regulations</li>
</ul>`);

const postfixHtml = ref(`<p>
    Thank you for your cooperation.
</p>`);
</script>

# Disclaimer

The `Disclaimer` component displays a modal disclaimer that users must accept before using the application. It shows on first visit or when the disclaimer version changes, providing a gatekeeping mechanism for terms of service, usage guidelines, or legal notices.

## Features

- **Modal Display**: Full-screen modal that blocks app access until accepted
- **Version Tracking**: Tracks accepted version in localStorage
- **HTML Content Support**: Rich text formatting with custom HTML
- **Customizable Confirmation**: Configurable acceptance checkbox and text
- **Automatic Detection**: Shows only when needed (first visit or version change)
- **Persistent State**: Remembers acceptance across sessions
- **Accessibility**: Keyboard accessible with proper focus management
- **Responsive Design**: Works seamlessly on all device sizes

## Props

| Prop                | Type     | Required | Description                                                           |
| ------------------- | -------- | -------- | --------------------------------------------------------------------- |
| `appName`           | `string` | Yes      | The name of your application, will be used for the default `contentHtml` and `confirmationText` when these props are not set.                                          |
| `confirmationText`  | `string` | No       | Text users must confirm by checking the box. When not set, the translation key `disclaimer.confirmation_text` will be used with `{appName}` as a placeholder.                           |
| `disclaimerVersion` | `string` | No       | Version identifier (e.g., "1.0.0") - changing this re-shows the modal |
| `contentHtml`       | `string` | No       | Main HTML content for the disclaimer body. When not set, the translation key `disclaimer.content` will be used.                             |
| `postfixHtml`       | `string` | No       | HTML content displayed after main content (e.g., contact info)        |

## Usage

### Basic Implementation

The simplest disclaimer with just text confirmation:

```vue
<template>
    <Disclaimer
        app-name="My Application"
        confirmation-text="I accept the terms and conditions."
        disclaimer-version="1.0.0"
    />
</template>
```

### Using Default Translations

If `confirmationText` and `contentHtml` are not provided, the component will automatically use the translation keys from your i18n configuration:

```vue
<template>
    <!-- Uses translations: disclaimer.confirmation_text and disclaimer.content -->
    <Disclaimer
        app-name="My Application"
        disclaimer-version="1.0.0"
    />
</template>
```

The default translations used are:
- **`disclaimer.confirmation_text`**: Contains the confirmation text with `{appName}` as a placeholder
- **`disclaimer.content`**: Contains the full HTML disclaimer content

You can customize these translations in your application's i18n files (e.g., `locales/en.json`, `locales/de.json`). See the [Internationalization section](../#internationalization) for the default translation keys.

## Interactive Example

Customize the disclaimer content and see changes in real-time, try to leave properties empty to see default behavior:

<div class="flex flex-col gap-2 mb-6 p-4 rounded-lg border">
  <label class="text-sm font-semibold">App Name:</label>
  <input v-model="appName" placeholder="App Name" class="border rounded px-3 py-2" />
  
  <label class="text-sm font-semibold">Confirmation Text:</label>
  <textarea
    v-model="confirmationText"
    placeholder="Type to confirm..."
    rows="3"
    class="border rounded px-3 py-2"
  />
  
  <label class="text-sm font-semibold">Content HTML:</label>
  <textarea
    v-model="contentHtml"
    placeholder="Content HTML"
    rows="6"
    class="border rounded px-3 py-2 font-mono text-sm"
  />
  
  <label class="text-sm font-semibold">Postfix HTML:</label>
  <textarea
    v-model="postfixHtml"
    placeholder="Postfix HTML"
    rows="3"
    class="border rounded px-3 py-2 font-mono text-sm"
  />
</div>

<DisclaimerExample :appName="appName" :confirmationText="confirmationText" :contentHtml="contentHtml" :postfixHtml="postfixHtml" />

## Version Management

The `disclaimerVersion` prop is crucial for managing disclaimer updates:

### Initial Version

```vue
<template>
    <Disclaimer app-name="My App" disclaimer-version="1.0.0" ... />
</template>
```

### Updating the Disclaimer

When you update your terms, increment the version:

```vue
<template>
    <!-- Users will need to accept again -->
    <Disclaimer app-name="My App" disclaimer-version="2.0.0" ... />
</template>
```

### Versioning Strategy

- **Major (1.0.0 → 2.0.0)**: Significant legal changes requiring user re-acceptance
- **Minor (1.0.0 → 1.1.0)**: Additional terms or clarifications
- **Patch (1.0.0 → 1.0.1)**: Minor wording improvements or typo fixes

## How It Works

1. **Component Mounts**: Checks localStorage for `disclaimerAccepted` key
2. **Version Check**: Compares stored version with current `disclaimerVersion` prop
3. **Display Logic**:
    - Shows modal if no version is stored (first visit)
    - Shows modal if stored version differs from current version
    - Hides modal if user has accepted current version
4. **User Acceptance**:
    - User must check the confirmation checkbox
    - Current version is stored in localStorage
    - Modal closes and user can access the app
5. **Subsequent Visits**: Modal doesn't show unless version changes

## localStorage Structure

```typescript
// Key: 'disclaimerAccepted'
// Value: Version string (e.g., "1.0.0")

localStorage.getItem("disclaimerAccepted"); // "1.0.0"
```
