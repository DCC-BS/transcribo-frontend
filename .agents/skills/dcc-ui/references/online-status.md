---
outline: deep
skillParent: dcc-ui
skillName: online-status
skillDescription: "OnlineStatus is a color-coded health indicator (green/red) with tooltip that polls a server health endpoint at a configurable pollInterval, with optional showText and custom isOnlineCheckFunction props. Use when showing live server connectivity status."
---
<script setup lang="ts">
import OnlineStatusExample from '../../../components/OnlineStatusExample.vue';
</script>

# OnlineStatus

The `OnlineStatus` component displays a real-time health status indicator that checks whether the application is online. It automatically polls the server at configurable intervals to verify connectivity and displays a visual indicator with tooltip information.

## Preview

<OnlineStatusExample />

## Features

- **Automatic Health Checks**: Configurable polling to verify server connectivity
- **Visual Indicator**: Color-coded status display (green for online, red for offline)
- **Tooltip Information**: Detailed status information on hover
- **Optional Text Label**: Show/hide status text alongside indicator
- **Smooth Transitions**: Animated color changes between states
- **i18n Integration**: Multilingual support for status messages
- **Lightweight**: Minimal performance impact
- **Customizable Polling**: Adjust check frequency to your needs

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `showText` | `boolean` | No | `false` | Whether to display text along with the status indicator |
| `pollInterval` | `number` | No | `30000` | The interval in milliseconds for checking online status (minimum: 1000ms) |
| `isOnlineCheckFunction` | `() => Promise<boolean>` | No | `checkIsOnline()` | Custom function to check online status. By default, uses the built-in `checkIsOnline` utility |

## Usage

### Basic Implementation

Simple status indicator without text:

```vue
<template>
  <OnlineStatus />
</template>
```

### With Text Label

Display status text alongside the indicator:

```vue
<template>
    <!-- Check every 60 seconds -->
  <OnlineStatus :show-text="true" :poll-interval="60000" />
</template>
```

### Custom Online Check Function

Provide your own function to determine online status:

```vue
<script setup lang="ts">
async function customOnlineCheck() {
  try {
    const response = await fetch('/api/custom-health');
    return response.ok;
  } catch {
    return false;
  }
}
</script>

<template>
   <OnlineStatus 
    :is-online-check-function="customOnlineCheck"
  /> 
</template>
```

### Status Indication

- **Online (Green)**: Server responds successfully
- **Offline (Red)**: Server request fails or times out

## i18n Configuration

The component requires the following translation keys:

```json
{
    "common-ui": {
        "health_status": {
        "online_title": "Online",
        "online_description": "Application is connected to the server",
        "offline_title": "Offline",
        "offline_description": "Unable to connect to the server"
        }
    }
}
```

## Health Check Endpoint

The component checks connectivity by sending requests to your application's health endpoint. Ensure your server has a health check endpoint configured.

### Example Server Setup (Nuxt)

```typescript
// server/api/health.get.ts
export default defineEventHandler(() => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
});
```
