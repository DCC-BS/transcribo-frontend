<script lang="ts" setup>
import type { IReversibleCommand } from '#build/types/commands';
import type { NavigationMenuItem } from '#ui/components/NavigationMenu.vue';
import type { ITransriboReversibleCommand } from '~/types/commands';

// Add translation hook
const { t } = useI18n();
const route = useRoute();

// Using a computed to reactively access the current path
const currentPath = computed<string>(() => route.path);
const { canRedo, canUndo, redo, undo, undoStack } = useCommandHistory();

const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const availableLocales = computed(() => {
    return locales.value.filter(i => i.code !== locale.value)
})

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
            label: t('navigation.undo'),
            icon: 'i-heroicons-arrow-uturn-left',
            onSelect: () => handleUndo(),
            disabled: !canUndo.value,
        },
        {
            label: t('navigation.redo'),
            icon: 'i-heroicons-arrow-uturn-right',
            onSelect: handleRedo,
            disabled: !canRedo.value,
        },
        {
            label: t('navigation.actions'),
            icon: 'i-heroicons-list-bullet',
            disabled: !canUndo.value,
            children: undoStack.value.slice(-10).reverse().map((action: ITransriboReversibleCommand, index: number) => ({
                label: `${t('navigation.undo')} ${action.toLocaleString(t)}`,
                onSelect: () => handleUndo(undoStack.value.length - index - (undoStack.value.length - Math.min(undoStack.value.length, 10))),
            } as NavigationMenuItem)),
        },
    ] : [],
    [
        {
            label: t('navigation.new'),
            to: '/',
            icon: 'i-heroicons-plus',
        },
        {
            label: t('navigation.transcriptions'),
            to: '/transcription',
            icon: 'i-heroicons-queue-list',
        }
    ],
    [
        {
            label: t('navigation.languages'),
            icon: 'i-heroicons-language',
            children: availableLocales.value.map((locale) => ({
                label: locale.name,
                to: switchLocalePath(locale.code),
            }))
        }
    ]
]);

/**
 * Handler for undo button click
 */
function handleUndo(amount: number = 1): void {
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
        <UNavigationMenu content-orientation="vertical" :items="items" class="w-full justify-between z-50" />
    </div>
</template>