---
outline: deep
skillParent: dcc-ui
skillName: disclaimer-button
skillDescription: "DisclaimerButton is a button (variant outline or ghost) that re-opens the already-accepted disclaimer modal on demand. Use when users need to re-view terms after acceptance, e.g. in the NavigationBar. NOT the initial modal gate (disclaimer) or full page (disclaimer-page)."
---
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import UiContainer from '../../../components/UiContainer.vue';
import { DisclaimerButton, Disclaimer } from "@dcc-bs/common-ui.bs.js/components";
import { useLocalStorage } from "@vueuse/core";

const disclaimerAcceptedVersion = useLocalStorage<string | undefined>(
    "disclaimerAccepted",
    "1.0.0",
);

onMounted(() => {
    disclaimerAcceptedVersion.value = "1.0.0";
});

const code = `<template>
    <div class="flex gap-5 justify-center">
        <div>
            <div><strong>Outline Variant:</strong></div>
            <DisclaimerButton variant="outline" />
        </div>
        <div>
            <div><strong>Ghost Variant:</strong></div>
            <DisclaimerButton variant="ghost" />
        </div>
    </div>
</template>`;
</script>

# DisclaimerButton

The `DisclaimerButton` component provides a button that allows users to view the disclaimer again after they have already accepted it. This is useful for applications that require users to review terms and conditions or usage guidelines at any time.

## Preview

<Disclaimer />
<UiContainer :code="code">
    <template #element>
        <div class="flex flex-col gap-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-sm text-blue-800">
                    <strong>Info:</strong> This button allows users to view the disclaimer again after accepting it. The button triggers the same disclaimer modal shown on first visit.
                </p>
            </div>
            <div class="flex gap-5 justify-center">
                <div>
                    <div><strong>Outline Variant:</strong></div>
                    <DisclaimerButton variant="outline" />
                </div>
                <div>
                    <div><strong>Ghost Variant:</strong></div>
                    <DisclaimerButton variant="ghost" />
                </div>
            </div>
        </div>
    </template>
</UiContainer>

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `variant` | `string` | No | `"outline"` | Button variant style. Options: `"outline"`, `"ghost"` |

## Usage

### Basic Implementation

Simply add the button wherever you want users to be able to review the disclaimer:

```vue
<template>
  <div>
    <DisclaimerButton />
  </div>
</template>
```

### With Custom Variant

Choose a different button style variant:

```vue
<template>
  <div>
    <!-- Ghost variant (minimal styling) -->
    <DisclaimerButton variant="ghost" />
    
    <!-- Outline variant (default) -->
    <DisclaimerButton variant="outline" />
  </div>
</template>
```

### In Navigation Bar

Commonly placed in the navigation bar for easy access (ghost variant is commonly used in navigation):

```vue
<template>
  <NavigationBar>
    <template #right>
      <DisclaimerButton variant="ghost" />
    </template>
  </NavigationBar>
</template>
```
