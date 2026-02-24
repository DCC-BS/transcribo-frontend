<script setup lang="ts">
const { t } = useI18n();

const route = useRoute();

const isHomePage = computed(() => route.fullPath === "/");
const isTranscriptionPage = computed(() => route.fullPath === "/transcription");
</script>

<template>
    <div class="flex flex-col min-h-screen">
        <NavigationMenu />
        <div class="grow">
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
        <DataBsFooter>
            <template #right>
                <FeedbackControl inline />
            </template>
        </DataBsFooter>
    </div>
</template>
