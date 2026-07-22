<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import type { EditorMode } from "~/types/editor";

const mode = defineModel<EditorMode>({ default: "view" });

const { t } = useI18n();

const items = computed<TabsItem[]>(() => [
    { value: "view", icon: "i-lucide-eye", label: t("mode.viewer") },
    { value: "summary", icon: "i-lucide-sparkles", label: t("mode.summary") },
    { value: "edit", icon: "i-lucide-square-pen", label: t("mode.editor") },
    {
        value: "statistics",
        icon: "i-lucide-bar-chart-2",
        label: t("mode.statistics"),
    },
]);
</script>

<template>
    <UTabs
        id="editor-mode-selector"
        v-model="mode"
        :items="items"
        :content="false"
        size="sm"
    >
        <template #default="{ item }">
            <span :id="`mode-${item.value}`" class="hidden sm:inline">{{
                item.label
            }}</span>
        </template>
    </UTabs>
</template>
