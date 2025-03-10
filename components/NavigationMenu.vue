<script lang="ts" setup>
import type { IReversibleCommand } from '#build/types/commands';
import type { NavigationMenuItem } from '#ui/components/NavigationMenu.vue';


const route = useRoute();

// Using a computed to reactively access the current path
const currentPath = computed<string>(() => route.path);
const { canRedo, canUndo, redo, undo, undoStack } = useCommandHistory();

/**
 * Check if current path is a transcription path
 * Uses the reactive route path for better reactivity
 */
const isTranscriptionPath = computed<boolean>(() => {
    return currentPath.value.includes('transcription/');
});

// Navigation menu items
const items = computed<NavigationMenuItem[][]>(() => [
    isTranscriptionPath.value ? [
        {
            label: '',
            icon: 'i-heroicons-arrow-uturn-left',
            onSelect: () => handleUndo(),
            disabled: !canUndo.value,
        },
        {
            label: '',
            icon: 'i-heroicons-arrow-uturn-right',
            onSelect: handleRedo,
            disabled: !canRedo.value,
        },
        {
            label: '',
            icon: 'i-heroicons-list-bullet',
            disabled: !canUndo.value,
            children: undoStack.value.map((action: IReversibleCommand, index: number) => ({
                label: `Undo ${action.toString()}`,
                onSelect: () => handleUndo(undoStack.value.length - index),
            } as NavigationMenuItem)),
        },
    ] : [],
    [
        {
            label: 'New',
            to: '/',
            icon: 'i-heroicons-plus',
        },
        {
            label: 'Transcriptions',
            to: '/transcription',
            icon: 'i-heroicons-queue-list',
        }
    ],
    []
]);

/**
 * Handler for undo button click
 */
function handleUndo(amount: number = 1): void {
    console.log('Undo', amount);

    for (let i = 0; i < amount; i++) {
        undo();
    }
}

function handleRedo(): void {
    redo();
}

</script>

<template>
    <div>
        <UNavigationMenu :items="items" class="w-full justify-between z-50" />
    </div>
</template>