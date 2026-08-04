---
outline: deep
skillParent: dcc-ui
skillName: useUserFeedback
skillDescription: "Vue/Nuxt composable returning showToast and showError to display Nuxt UI toast notifications (success/info/warning/error) and i18n-translated API error messages. Use when surfacing user feedback, toasts, or handling ApiError responses in a DCC frontend."
---
# useUserFeedback composable

The `useUserFeedback` composable provides a unified interface for displaying toast notifications and error messages to users. It integrates with Nuxt UI's toast system and supports internationalization for API errors.

## Return Values

The composable returns an object with the following functions:

**showToast(message, type, options)**

Display a toast notification.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | `string` | Yes | The message to display |
| `type` | `FeedbackType` | No | Type of feedback - `"error"`, `"success"`, `"info"`, or `"warning"`. Default is `"error"` |
| `options` | `Partial<Toast>` | No | Additional toast options (title, duration, etc.) |

**showError(error)**

Display an error message.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `error` | `Error \| ApiError` | Yes | An Error object or ApiError object with error details |

## Types

```typescript
type FeedbackType = "error" | "success" | "info" | "warning";

// see also https://github.com/DCC-BS/communication.bs.js
type ApiError = {
  $type: "ApiError";
  errorId: string;
  debugMessage?: string;
  status: number;
};
```

## Requirements

This composable requires:
- Nuxt UI module configured
- Nuxt i18n module configured (for API error translations)
- Translation keys in format `api_error.{errorId}` for API errors

## Example Usage

```vue
<script setup lang="ts">
const { showToast, showError } = useUserFeedback();


// Show a success toast
function onSaveSuccess() {
  showToast("Data saved successfully!", "success");
}

// Show an error toast with custom duration
function onValidationError() {
  showToast("Please fill in all required fields", "error", {
    duration: 5000
  });
}

// Show a warning toast
function onWarning() {
  showToast("This action cannot be undone", "warning");
}

// Show an info toast
function onInfo() {
  showToast("Your changes are being processed", "info");
}

// Custom toast options
function showCustomToast() {
  showToast("Operation completed", "success", {
    title: "Success",
    duration: 10000,
    actions: [{
      label: "Undo",
      click: () => console.log("Undo clicked")
    }]
  });
}
</script>

<template>
  <div>
    <button @click="onSaveSuccess">Save</button>
    <button @click="fetchData">Fetch Data</button>
  </div>
</template>
```

## API Error Handling

When using `showError` with an API error that has the `$type: "ApiError"` property, the composable will automatically look up the translation key based on the `errorId`:

```ts
import { apiFetch, isApiError } from "@DCC-BS/communication.bs.js";

const { showError } = useUserFeedback();

// Handle API errors
async function fetchData() {
    const response = await apiFetch<Data>("/api/data");
    
    if(isApiError(response)) {
      showError(response);
      return;
    }
    
    // Process the successful response
}
```

Make sure to define your API error translations in your i18n configuration:

```json
{
  "api_error": {
    "not_found": "The requested resource was not found",
    "unauthorized": "You are not authorized to perform this action",
    "server_error": "An unexpected server error occurred"
  }
}
```
