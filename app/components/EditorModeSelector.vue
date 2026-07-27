<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";
import type { EditorMode } from "~/types/editor";

const mode = defineModel<EditorMode>({ default: "view" });

const { t } = useI18n();

// The onboarding anchors on the `mode-<value>` trigger class: the label is
// hidden on small screens, so an anchor on it would have no box there.
function tabUi(value: string) {
    return { trigger: `mode-${value}`, label: "hidden sm:inline" };
}

const items = computed<TabsItem[]>(() => [
    {
        value: "view",
        icon: "i-lucide-eye",
        label: t("mode.viewer"),
        ui: tabUi("view"),
    },
    {
        value: "summary",
        icon: "i-lucide-sparkles",
        label: t("mode.summary"),
        ui: tabUi("summary"),
    },
    {
        value: "edit",
        icon: "i-lucide-square-pen",
        label: t("mode.editor"),
        ui: tabUi("edit"),
    },
    {
        value: "statistics",
        icon: "i-lucide-bar-chart-2",
        label: t("mode.statistics"),
        ui: tabUi("statistics"),
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
    />
</template>
