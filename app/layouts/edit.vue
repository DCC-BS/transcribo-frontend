<script setup lang="ts">
const { t } = useI18n();

const { canRedo, canUndo, redo, undo } = useCommandHistory();
</script>

<template>
    <NavigationMenu />

    <Teleport to="#nav-center-portal">
        <!-- Center: Action buttons -->
        <div class="flex items-center justify-center shrink-0">
            <UndoRedoButtons :canRedo="canRedo" :canUndo="canUndo" @undo="() => undo()" @redo="() => redo()" />
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
    </Teleport>

    <div>
        <div>
            <div class="m-2 ring-1 ring-default rounded-md shadow-[2px_2px_1px_1px_#0000000D]">
                <div class="border-b border-default p-2">
                    <div class="w-full flex justify-between items-center gap-2">
                        <!-- Transcription Info Portal Target (left-aligned) -->
                        <div id="transcription-info-portal" class="flex-1 min-w-0" />

                        <!-- Center: Action buttons -->
                        <div class="flex items-center justify-center shrink-0">
                            <UndoRedoButtons :canRedo="canRedo" :canUndo="canUndo" @undo="() => undo()"
                                @redo="() => redo()" />
                        </div>

                        <!-- Export Portal Target (right-aligned) -->
                        <div id="export-portal" class="flex-1 min-w-0 flex justify-end" />
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
