<script lang="ts" setup>
import type { NavigationMenuItem } from "#ui/components/NavigationMenu.vue";
import type { ITransriboReversibleCommand } from "~/types/commands";

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
                  icon: "i-heroicons-arrow-uturn-left",
                  onSelect: () => handleUndo(),
                  disabled: !canUndo.value,
              },
              {
                  label: t("navigation.redo"),
                  icon: "i-heroicons-arrow-uturn-right",
                  onSelect: handleRedo,
                  disabled: !canRedo.value,
              },
              {
                  label: t("navigation.actions"),
                  icon: "i-heroicons-list-bullet",
                  disabled: !canUndo.value,
                  children: undoStack.value
                      .slice(-10)
                      .reverse()
                      .map(
                          (
                              action: ITransriboReversibleCommand,
                              index: number,
                          ) =>
                              ({
                                  label: `${t("navigation.undo")} ${action.toLocaleString(t)}`,
                                  onSelect: () =>
                                      handleUndo(
                                          undoStack.value.length -
                                              index -
                                              (undoStack.value.length -
                                                  Math.min(
                                                      undoStack.value.length,
                                                      10,
                                                  )),
                                      ),
                              }) as NavigationMenuItem,
                      ),
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
            icon: "i-heroicons-plus",
        },
        {
            label: t("navigation.transcriptions"),
            to: "/transcription",
            icon: "i-heroicons-queue-list",
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
        <ClientOnly>
            <UNavigationMenu content-orientation="vertical" variant="link" :items="items"
                class="w-full justify-between align-top z-50">
                <template #disclaimer>
                    <DisclaimerButton variant="ghost" />
                </template>
            </UNavigationMenu>
            <template #fallback>
                <div class="w-full h-12 bg-gray-100 animate-pulse rounded"></div>
            </template>
        </ClientOnly>
    </div>
</template>
