<script setup lang="ts">
const { t } = useI18n();

const route = useRoute();

const isHomePage = computed(() => route.fullPath === "/");
const isTranscriptionPage = computed(() => route.fullPath === "/transcription");
</script>

<template>
    <NavigationMenu />
    <div>
        <div>
            <UContainer class="py-12 space-y-12">
                <p class="text-lg text-gray-600 dark:text-gray-300">
                    {{ t("pages.index.subtitle") }}
                </p>

                <HContainer>
                    <template #top>
                        <div class="w-full flex justify-center items-center">
                            <ULink to="/">
                                <UButton :variant="isHomePage ? 'soft' : 'ghost'" icon="i-lucide-plus">
                                    {{ t("navigation.new") }}
                                </UButton>
                            </ULink>
                            <ULink to="transcription">
                                <UButton :variant="isTranscriptionPage ? 'soft' : 'ghost'" icon="i-lucide-list">
                                    {{ t("navigation.transcriptions") }}
                                </UButton>
                            </ULink>
                        </div>
                    </template>
                    <slot />
                </HContainer>
            </UContainer>
        </div>
        <DataBsFooter />
    </div>
</template>
