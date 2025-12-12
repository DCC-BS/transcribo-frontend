<script lang="ts" setup>
import type { NavigationMenuItem } from "@nuxt/ui";

// Add translation hook
const { t } = useI18n();
const route = useRoute();

// Using a computed to reactively access the current path
const currentPath = computed<string>(() => route.path);
const { canRedo, canUndo, redo, undo, undoStack } = useCommandHistory();

const { availableLocales } = useI18n();
const switchLocalePath = useSwitchLocalePath();

/**
 * Check if current path is a transcription path
 * Uses the reactive route path for better reactivity
 */
const isTranscriptionPath = computed<boolean>(() => {
    return currentPath.value.includes("transcription/");
});

// Navigation menu items
const items = computed<NavigationMenuItem[][]>(() => [
    isTranscriptionPath.value
        ? [
            {
                slot: "disclaimer",
                as: "link",
            },
            {
                label: t("navigation.undo"),
                icon: "i-lucide-undo",
                onSelect: () => handleUndo(),
                disabled: !canUndo.value,
            },
            {
                label: t("navigation.redo"),
                icon: "i-lucide-redo",
                onSelect: handleRedo,
                disabled: !canRedo.value,
            },
        ]
        : [
            {
                slot: "disclaimer",
                as: "link",
            },
        ],
    [
        {
            label: t("navigation.new"),
            to: "/",
            icon: "i-lucide-plus",
        },
        {
            label: t("navigation.transcriptions"),
            to: "/transcription",
            icon: "i-lucide-queue-list",
        },
    ],
    [
        {
            label: t("navigation.languages"),
            icon: "i-heroicons-language",
            children: availableLocales.map((locale) => ({
                label: t(`navigation.${locale}`),
                to: switchLocalePath(locale),
            })),
        },
    ],
]);

/**
 * Handler for undo button click
 */
function handleUndo(amount = 1): void {
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

        <!-- [
            {
                label: t("navigation.new"),
                to: "/",
                icon: "i-heroicons-plus",
            },
            {
                label: t("navigation.transcriptions"),
                to: "/transcription",
                icon: "i-heroicons-queue-list",
            },
        ], -->

        <NavigationBar>
            <template #center>
                <div class="flex items-end justify-between w-full">
                    <div v-if="isTranscriptionPath" class="flex gap-2 ml-8">
                        <UButton icon="i-lucide-undo" @click="() => handleUndo()" :disabled="!canUndo" variant="link">
                            {{ t('navigation.undo') }}
                        </UButton>
                        <UButton icon="i-lucide-redo" @click="handleRedo" :disabled="!canRedo" variant="link">
                            {{ t('navigation.redo') }}
                        </UButton>
                    </div>
                    <div v-else class="flex-1"></div>
                    <div class="flex gap-2 absolute left-1/2 transform -translate-x-1/2">
                        <UButton icon="i-lucide-plus" to="/" variant="link">
                            {{ t('navigation.new') }}
                        </UButton>
                        <UButton icon="i-lucide-list-music" to="/transcription" variant="link">
                            {{ t('navigation.transcriptions') }}
                        </UButton>
                    </div>
                </div>
            </template>
        </NavigationBar>

        <!-- <ClientOnly>
            <UNavigationMenu content-orientation="vertical" variant="link" :items="items"
                class="w-full grid grid-cols-3 items-center z-50 [&>*:nth-child(1)]:justify-self-start [&>*:nth-child(2)]:justify-self-center [&>*:nth-child(3)]:justify-self-end">
                <template #disclaimer>
                    <DisclaimerButton variant="ghost" />
                </template>
            </UNavigationMenu>

        </ClientOnly> -->
    </div>
</template>
