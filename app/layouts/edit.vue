<script setup lang="ts">
const { t } = useI18n();

const { canRedo, canUndo, redo, undo } = useCommandHistory();
</script>

<template>
    <NavigationMenu />

    <Teleport to="#nav-center-portal">
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
                <ULink to="transcription">
                    <UButton variant="ghost" icon="i-lucide-list">
                        <span class="hidden md:inline">
                            {{ t("navigation.transcriptions") }}
                        </span>
                    </UButton>
                </ULink>
            </UTooltip>
        </div>
    </Teleport>

    <div>
        <div>
            <slot />
        </div>
        <DataBsFooter />
    </div>
</template>
