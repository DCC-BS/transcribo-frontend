<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
    <UPopover>
        <UButton
            icon="i-lucide-settings"
            variant="ghost"
            color="neutral"
            :title="t('navigation.settings')"
        />
        <template #content>
            <div class="flex w-64 flex-col gap-1 p-1.5 text-sm">
                <div
                    class="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-muted"
                >
                    {{ t("navigation.settings") }}
                </div>
                <UButton
                    to="/vocabulary"
                    icon="i-lucide-book-a"
                    variant="ghost"
                    color="neutral"
                    class="justify-start"
                >
                    {{ t("vocabulary.title") }}
                </UButton>
            </div>
        </template>
    </UPopover>
</template>
