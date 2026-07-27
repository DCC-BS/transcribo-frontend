<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
    <header
        class="relative flex min-h-12 flex-none flex-wrap items-center gap-2 border-b border-default bg-default px-2.5 py-1 md:h-12 md:flex-nowrap md:py-0"
    >
        <NuxtLink
            to="/"
            :title="t('navigation.home')"
            class="flex items-center gap-1.5 px-1.5 font-bold tracking-tight text-(--ui-primary-strong)"
        >
            <UIcon name="i-lucide-house" class="size-4" />
            {{ t("navigation.app") }}
        </NuxtLink>

        <div id="appbar-context" class="flex min-w-0 items-center gap-2" />

        <div class="grow" />

        <div id="appbar-actions" class="flex items-center gap-2" />

        <AppBarHelpButton />
        <AppBarSettingsMenu />
    </header>
</template>
