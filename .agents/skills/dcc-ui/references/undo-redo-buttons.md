---
outline: deep
skillParent: dcc-ui
skillName: undo-redo-buttons
skillDescription: "UndoRedoButtons is a pair of tooltip buttons taking canUndo/canRedo props and emitting @undo/@redo events, auto-disabled when unavailable. Use when adding undo/redo controls to an editor or form."
---
<script setup lang="ts">
import { ref } from 'vue';
import UiContainer from '../../../components/UiContainer.vue';
import UndoRedoButtonMock from '../../../components/UndoRedoButtonMock.vue';
import { UndoRedoButtons } from "@dcc-bs/common-ui.bs.js/components";

const canUndo = ref(true);
const canRedo = ref(true);

function handleUndo() {
}

function handleRedo() {
}

const code = `<script setup lang=\"ts\">
import { ref } from \"vue\";

const canUndo = ref(false);
const canRedo = ref(false);

function handleUndo() {
    console.log(\"Undo action\");
}

function handleRedo() {
    console.log(\"Redo action\");
}
<\/script>
<template>
  <UndoRedoButtons 
    :can-undo=\"canUndo\" 
    :can-redo=\"canRedo\"
    @undo=\"handleUndo\"
    @redo=\"handleRedo\"
  />
</template>`;
</script>

# UndoRedoButtons

The `UndoRedoButtons` component provides undo and redo functionality with tooltips. The buttons are automatically disabled when undo/redo actions are not available, providing a consistent user experience across applications.

::: info Keyboard Shortcuts
The tooltips mention keyboard shortcuts (Ctrl+Z for undo and Ctrl+Y for redo), but these shortcuts are not implemented by the component itself. Applications using this component need to implement their own keyboard event handlers to support these shortcuts.
:::

## Localization

The tooltip text can be customized using the following localization keys:

| Key | Default Value | Description |
|-----|---------------|-------------|
| `common-ui.undo_tooltip` | "Undo (Ctrl+Z)" | Tooltip text for the undo button |
| `common-ui.redo_tooltip` | "Redo (Ctrl+Y)" | Tooltip text for the redo button |

Override these keys in your application's localization configuration to customize the tooltip text.

## Preview

<UiContainer :code="code">
    <template #element>
        <UndoRedoButtonMock />
    </template>
</UiContainer>

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `canUndo` | `boolean` | Yes | - | Whether undo action is available |
| `canRedo` | `boolean` | Yes | - | Whether redo action is available |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@undo` | None | Emitted when the undo button is clicked |
| `@redo` | None | Emitted when the redo button is clicked |

## Usage

### Basic Implementation

Simple undo/redo buttons:

```vue
<script setup lang="ts">
import { ref } from 'vue';

const canUndo = ref(false);
const canRedo = ref(false);

function handleUndo() {
  console.log('Undo action');
}

function handleRedo() {
  console.log('Redo action');
}
</script>

<template>
  <UndoRedoButtons 
    :can-undo="canUndo" 
    :can-redo="canRedo"
    @undo="handleUndo"
    @redo="handleRedo"
  />
</template>
```
