<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();

const apps = useAppList("Transcribo");
const isHome = computed(() => route.path === "/");
</script>

<template>
    <header class="flex-none border-b border-default bg-default">
        <NavigationBar :other-apps="apps">
            <template #left>
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <NuxtLink id="appbar-home-link" to="/" :title="t('navigation.home')"
                        class="flex items-center gap-1.5 text-xl font-bold">
                        <UIcon v-if="!isHome" name="i-lucide-chevron-left" class="size-6" />
                        {{ t("navigation.app") }}
                    </NuxtLink>

                    <div id="appbar-context" class="flex min-w-0 items-center gap-2" />
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
