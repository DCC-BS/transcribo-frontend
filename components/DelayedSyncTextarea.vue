<script lang="ts" setup>
// Component that only syncs v-model on blur and enter key press
const props = defineProps<{
    modelValue: string;
    // Allow all UTextarea props to be passed through
    [key: string]: any;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

// Local state to track the current input value
const localValue = ref(props.modelValue);

// Track focus state
const isFocused = ref(false);

// Compute if the textarea content has changed
const isDirty = computed(() => {
    return localValue.value !== props.modelValue;
});

// Watch for external changes to modelValue
watch(
    () => props.modelValue,
    (newValue) => {
        localValue.value = newValue;
    }
);

// Handle keydown events and sync on Enter key press
function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
        // Only sync when Enter is pressed without Shift
        emit('update:modelValue', localValue.value);
    }
}

// Handle blur events to sync the value
function handleBlur() {
    isFocused.value = false;
    emit('update:modelValue', localValue.value);
}

// Handle focus events
function handleFocus() {
    isFocused.value = true;
}

// Extract UTextarea props by removing modelValue from props
const textareaProps = computed(() => {
    const { modelValue, ...rest } = props;
    return rest;
});
</script>

<template>
    <div class="relative w-full">
        <!-- Tooltip that shows when textarea is dirty and focused -->
        <UTooltip :text="'Textfeld verlassen oder Enter drücken, um Änderungen zu übernehmen'"
            :popper="{ placement: 'top' }" :open="isFocused && isDirty" class="w-full">
            <UTextarea v-bind="textareaProps" :model-value="localValue" @update:model-value="localValue = $event"
                @blur="handleBlur" @focus="handleFocus" @keydown="handleKeydown" />
        </UTooltip>
    </div>
</template>
