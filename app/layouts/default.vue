<script setup lang="ts">
const { t } = useI18n();

const route = useRoute();

const isHomePage = computed(() => route.fullPath === "/");
const isTranscriptionPage = computed(() => route.fullPath === "/transcription");
</script>

<template>
    <div class="min-h-screen flex flex-col justify-stretch">
        <NavigationMenu>
            <template #center>
                <!-- Center: Action buttons -->
                <div class="flex items-center justify-center shrink-0 h-full">
                    <UTooltip :text="t('navigation.new')">
                        <ULink to="/">
                            <UButton variant="ghost" icon="i-lucide-plus">
                                <span class="hidden md:inline">
                                    {{ t("navigation.new") }}
                                </span>
                            </UButton>
                        </ULink>
                    </UTooltip>

                    <UTooltip :text="t('navigation.transcriptions')">
                        <ULink to="/transcription">
                            <UButton variant="ghost" icon="i-lucide-list">
                                <span class="hidden md:inline">
                                    {{ t("navigation.transcriptions") }}
                                </span>
                            </UButton>
                        </ULink>
                    </UTooltip>
                </div>
            </template>
        </NavigationMenu>

        <div class="grow flex flex-col justify-stretch">
            <div class="flex flex-col grow">
                <slot />
            </div>
            <DataBsFooter>
                <template #right>
                    <FeedbackControl inline />
                </template>
            </DataBsFooter>
        </div>
    </div>
</template>
