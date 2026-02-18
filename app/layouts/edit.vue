<script setup lang="ts">
const { t } = useI18n();


const { canRedo, canUndo, redo, undo } = useCommandHistory();
</script>

<template>
    <NavigationMenu />
    <div>
        <div>
            <div class="m-2 ring-1 ring-default rounded-md shadow-[2px_2px_1px_1px_#0000000D]">
                <div class="border-b border-default p-2">
                    <div class="w-full flex justify-center items-center">
                        <UndoRedoButtons :canRedo="canRedo" :canUndo="canUndo" @undo="() => undo()"
                            @redo="() => redo()" />
                        <ULink to="/">
                            <UButton variant="ghost" icon="i-lucide-plus">
                                {{ t("navigation.new") }}
                            </UButton>
                        </ULink>
                        <ULink to="transcription">
                            <UButton variant="ghost" icon="i-lucide-list">
                                {{ t("navigation.transcriptions") }}
                            </UButton>
                        </ULink>
                    </div>
                </div>

                <div class="p-2">
                    <slot />
                </div>
            </div>
        </div>
        <DataBsFooter />
    </div>
</template>
