<script lang="ts" setup>
// Component that only syncs v-model on blur and enter key press
const props = defineProps<{
    modelValue: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const { t } = useI18n();

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
</script>

<template>
    <div class="relative w-full">
        <!-- Tooltip that shows when textarea is dirty and focused -->
        <UTooltip
            :text="t('ui.saveChangesHint')"
            :popper="{ placement: 'top' }" :open="isFocused && isDirty" class="w-full">
            <UTextarea
                :model-value="localValue" @update:model-value="localValue = $event as string" @blur="handleBlur"
                @focus="handleFocus" @keydown="handleKeydown" />
        </UTooltip>
    </div>
</template>
