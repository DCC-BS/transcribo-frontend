---
outline: deep
skillParent: dcc-ui
skillName: split-view
skillDescription: "SplitView is a resizable two-pane layout with a draggable resizer, a/b slots, isHorizontal orientation toggle, and per-pane/resizer style props. Use when users need to drag-adjust pane proportions. NOT a fixed card (use split-container for a non-resizable header layout)."
---
<script setup lang="ts">
import { ref } from 'vue';
import UiContainer from '../../../components/UiContainer.vue';
import { SplitView } from "@dcc-bs/common-ui.bs.js/components";

const isHorizontal = ref(false);
const defaultClickedResizerInnerStyle = "bg-blue-200";

const verticalSplitViewStyle = "flex w-full h-full";
const verticalAPaneStyle = "overflow-auto";
const verticalBPaneStyle = "overflow-auto";
const verticalResizerStyle =
    "w-[16px] cursor-col-resize relative pointer-events-auto flex justify-center";
const verticalResizerInnerStyle = "bg-gray-100 w-[2px] h-full";

const horizontalSplitViewStyle = "flex flex-col w-full h-full";
const horizontalAPaneStyle = "overflow-auto";
const horizontalBPaneStyle = "overflow-auto";
const horizontalResizerStyle =
    "h-[16px] cursor-row-resize relative pointer-events-auto flex items-center";
const horizontalResizerInnerStyle = "bg-gray-100 h-[2px] w-full";

const code = `<SplitView :is-horizontal="isHorizontal">
    <template #a>
        <div class="p-4 h-full overflow-auto">
            <h3 class="text-lg font-semibold mb-2">Pane A</h3>
            <p>This is Pane A. Drag the resizer to adjust the split.</p>
        </div>
    </template>
    <template #b>
        <div class="p-4 h-full overflow-auto">
            <h3 class="text-lg font-semibold mb-2">Pane B</h3>
            <p>This is Pane B. The split view supports both horizontal and vertical orientations.</p>
        </div>
    </template>
</SplitView>`;
</script>

# SplitView

The `SplitView` component allows you to create a resizable split view layout with two panes separated by a draggable resizer. It supports both horizontal and vertical orientations, giving users full control over the layout proportions.

## Preview

<UiContainer :code="code">
    <template #element>
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <input
                        id="is-horizontal"
                        v-model="isHorizontal"
                        type="checkbox"
                        class="w-4 h-4"
                    />
                    <label for="is-horizontal" class="text-sm font-medium">
                        Horizontal Split (unchecked = vertical)
                    </label>
                </div>
            </div>
            <div class="border rounded-lg relative" style="height: 400px;">
                <SplitView :is-horizontal="isHorizontal">
                    <template #a>
                        <div class="p-4 h-full overflow-auto">
                            <h3 class="text-lg font-semibold mb-2">Pane A</h3>
                            <p>This is Pane A. Drag the resizer to adjust the split.</p>
                        </div>
                    </template>
                    <template #b>
                        <div class="p-4 h-full overflow-auto">
                            <h3 class="text-lg font-semibold mb-2">Pane B</h3>
                            <p>This is Pane B. The split view supports both horizontal and vertical orientations.</p>
                        </div>
                    </template>
                </SplitView>
            </div>
        </div>
    </template>
</UiContainer>

## Features

- **Resizable Panes**: Users can drag the resizer to adjust pane sizes
- **Dual Orientation**: Supports both horizontal and vertical splits
- **Smooth Resizing**: Fluid drag interaction with visual feedback
- **Customizable Styling**: Style each pane and resizer independently
- **Flexible Content**: Accepts any content in either pane
- **Keyboard Accessible**: Resizer can be controlled with keyboard
- **Touch Support**: Works on touch devices

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `aPaneStyle` | `string` | No | `""` | Custom CSS classes for the first pane (pane A) |
| `bPaneStyle` | `string` | No | `""` | Custom CSS classes for the second pane (pane B) |
| `splitViewStyle` | `string` | No | `""` | Custom CSS classes for the split view container |
| `resizerStyle` | `string` | No | `""` | Custom CSS classes for the resizer element |
| `resizerInnerStyle` | `string` | No | `""` | Custom CSS classes for the inner resizer element |
| `isHorizontal` | `boolean` | No | `false` | Determines the orientation (false = vertical, true = horizontal) |

## Slots

| Slot | Description |
|------|-------------|
| `a` | Content for the first pane (left pane in vertical mode, top pane in horizontal mode) |
| `b` | Content for the second pane (right pane in vertical mode, bottom pane in horizontal mode) |

## Usage

### Basic Implementation (Vertical Split)

Create a simple vertical split view:

```vue
<template>
  <SplitView>
    <template #a>
      <div>Left Pane Content</div>
    </template>
    <template #b>
      <div>Right Pane Content</div>
    </template>
  </SplitView>
</template>
```

### Horizontal Split

Create a horizontal split (top/bottom):

```vue
<template>
  <SplitView :is-horizontal="true">
    <template #a>
      <div>Top Pane Content</div>
    </template>
    <template #b>
      <div>Bottom Pane Content</div>
    </template>
  </SplitView>
</template>
```

### With Custom Styling

Apply custom styles to panes and resizer:

```vue
<template>
  <SplitView
    a-pane-style="bg-blue-50 p-4"
    b-pane-style="bg-green-50 p-4"
    resizer-style="bg-gray-300"
  >
    <template #a>
      <div>Styled Left Pane</div>
    </template>
    <template #b>
      <div>Styled Right Pane</div>
    </template>
  </SplitView>
</template>
```

## Orientation Modes

### Vertical Split (Default)

```
┌─────────┬─────────┐
│         │         │
│ Pane A  │ Pane B  │
│  (a)    │  (b)    │
│         │         │
└─────────┴─────────┘
```

- `isHorizontal="false"` (default)
- Panes are side-by-side (left/right)
- Resizer is vertical
- Drag left/right to resize

### Horizontal Split

```
┌───────────────────┐
│     Pane A (a)    │
├───────────────────┤
│     Pane B (b)    │
└───────────────────┘
```

- `isHorizontal="true"`
- Panes are stacked (top/bottom)
- Resizer is horizontal
- Drag up/down to resize
