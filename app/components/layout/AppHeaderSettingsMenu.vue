<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const { t } = useI18n();

const items: DropdownMenuItem[] = [
    {
        to: "/vocabulary",
        icon: "i-lucide-book-a",
        label: t("vocabulary.title"),
    },
];
</script>

<template>
    <SettingsButton :items="items" :trigger-label="t('navigation.settings')" />
</template>
