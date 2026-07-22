<script setup lang="ts">
import { ShowOnboardingCommand } from "~/types/commands";

const { t } = useI18n();
const { executeCommand } = useCommandBus();
const { currentRoute } = useRouter();

const isInEditor = computed(
    () => currentRoute.value.path.match(/transcription\/.+/) !== null,
);
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
                <div class="flex items-center justify-between px-2.5 py-1">
                    <span class="flex items-center gap-2.5">
                        <UIcon name="i-lucide-globe" class="size-4" />
                        {{ t("navigation.language") }}
                    </span>
                    <LanguageSelect />
                </div>
                <USeparator />
                <UButton
                    to="/vocabulary"
                    icon="i-lucide-book-a"
                    variant="ghost"
                    color="neutral"
                    class="justify-start"
                >
                    {{ t("vocabulary.title") }}
                </UButton>
                <UButton
                    v-if="isInEditor"
                    id="help-button"
                    icon="i-lucide-circle-help"
                    variant="ghost"
                    color="neutral"
                    class="justify-start"
                    @click="executeCommand(new ShowOnboardingCommand())"
                >
                    {{ t("onboarding.help") }}
                </UButton>
                <DisclaimerButton variant="ghost" />
            </div>
        </template>
    </UPopover>
</template>
