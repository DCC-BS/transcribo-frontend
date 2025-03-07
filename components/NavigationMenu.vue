<script lang="ts" setup>
import { UNavigationMenu } from '#components';

// Navigation menu items
const items = ref([
    [
        {
            label: '',
            icon: 'i-heroicons-arrow-uturn-left',
            onclick: handleUndo,
        },
        {
            label: '',
            icon: 'i-heroicons-arrow-uturn-right',
            onclick: handleRedo,
        },
        {
            label: '',
            icon: 'i-heroicons-list-bullet',
            onclick: handleUndoStack,
        },
    ],
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
function handleUndo(): void {
    // Implement undo functionality here
    console.log('Undo clicked');
}

/**
 * Handler for redo button click
 */
function handleRedo(): void {
    // Implement redo functionality here
    console.log('Redo clicked');
}

/**
 * Handler for undo stack button click
 * Shows the history of actions that can be undone
 */
function handleUndoStack(): void {
    // Implement undo stack functionality here
    console.log('Undo stack clicked');
}
</script>

<template>
    <div>
        <UNavigationMenu :items="items" class="w-full justify-between" />
    </div>
</template>