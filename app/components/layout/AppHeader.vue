<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
    <header class="flex-none border-b border-default bg-default">
        <NavigationBar>
            <template #left>
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <NuxtLink
                        id="appbar-home-link"
                        to="/"
                        :title="t('navigation.home')"
                        class="flex items-center gap-1.5 px-1.5 font-bold tracking-tight text-(--ui-primary-strong)"
                    >
                        <UIcon name="i-lucide-house" class="size-4" />
                        {{ t("navigation.app") }}
                    </NuxtLink>

                    <div
                        id="appbar-context"
                        class="flex min-w-0 items-center gap-2"
                    />
                </div>
            </template>

            <template #rightPreItems>
                <div id="appbar-actions" class="flex items-center gap-2" />
            </template>

            <template #rightPostItems>
                <AppHeaderSettingsMenu />
            </template>
        </NavigationBar>
    </header>
</template>
