<script setup lang="ts">
import { ShowOnboardingCommand } from "~/types/commands";

const { t } = useI18n();

const { executeCommand } = useCommandBus();

const { currentRoute } = useRouter();

const isInEditor = computed(() => {
    return currentRoute.value.path.match(/transcription\/.+/) !== null;
});
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
            <template #rightPreItems>
                <UTooltip v-if="isInEditor" :text="t('onboarding.help')">
                    <UButton
                        id="help-button"
                        icon="i-lucide-circle-help"
                        variant="ghost"
                        color="neutral"
                        @click="executeCommand(new ShowOnboardingCommand())"
                    />
                </UTooltip>
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
