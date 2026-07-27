<script setup lang="ts">
import { ShowOnboardingCommand } from "~/types/commands";

const { t } = useI18n();
const { executeCommand } = useCommandBus();
const { currentRoute } = useRouter();

// the tour only has something to point at inside a transcription
const isInEditor = computed(
    () => currentRoute.value.path.match(/transcription\/.+/) !== null,
);
</script>

<template>
    <UButton
        v-if="isInEditor"
        id="help-button"
        icon="i-lucide-circle-help"
        variant="ghost"
        color="neutral"
        :title="t('onboarding.help')"
        @click="executeCommand(new ShowOnboardingCommand())"
    />
</template>
