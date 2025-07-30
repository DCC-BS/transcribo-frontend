<script lang="ts" setup>
import type { ExportOptions } from "~/composables/export";

const { t } = useI18n();
const { exportAsText, exportAsSrt, exportAsJson } = useExport();
const transcriptionStore = useTranscriptionsStore();

// Export options state
const exportOptions = ref<ExportOptions>({
    withSpeakers: true,
    withTimestamps: true,
    mergeSegments: false,
    withSummary: false,
});

// Functions to handle exports
function handleTextExport(): void {
    exportAsText(exportOptions.value);
}

function handleSubtitleExport(): void {
    exportAsSrt(exportOptions.value.withSpeakers);
}

function handleJsonExport(): void {
    exportAsJson();
}
</script>

<template>
    <UPopover>
        <UButton 
            icon="i-heroicons-arrow-down-tray"
            :label="t('export.export')"
            trailing-icon="i-heroicons-chevron-down"
            color="primary"
        />
        
        <template #content>
            <div class="p-4 w-80">
                <!-- Export Options Section -->
                <div class="mb-4">
                    <h4 class="font-medium text-sm mb-3">{{ t('export.optionsTitle') }}</h4>
                    
                    <!-- Speaker information toggle -->
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm">{{ t('export.withSpeakers') }}</span>
                        <USwitch v-model="exportOptions.withSpeakers" />
                    </div>
                    
                    <!-- Timestamps toggle (text only) -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex flex-col">
                            <span class="text-sm">{{ t('export.withTimestamps') }}</span>
                            <span class="text-xs text-gray-500">{{ t('export.textOnly') }}</span>
                        </div>
                        <USwitch v-model="exportOptions.withTimestamps" />
                    </div>
                    
                    <!-- Merge segments toggle (text only) -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex flex-col">
                            <span class="text-sm">{{ t('export.mergeSegments') }}</span>
                            <span class="text-xs text-gray-500">{{ t('export.textOnly') }}</span>
                        </div>
                        <USwitch v-model="exportOptions.mergeSegments" />
                    </div>
                    
                    <!-- Meeting summary toggle (text only) -->
                    <div 
                        v-if="transcriptionStore.currentTranscription?.summary"
                        class="flex items-center justify-between mb-3"
                    >
                        <div class="flex flex-col">
                            <span class="text-sm">{{ t('export.withSummary') }}</span>
                            <span class="text-xs text-gray-500">{{ t('export.textOnly') }}</span>
                        </div>
                        <USwitch v-model="exportOptions.withSummary" />
                    </div>
                </div>
                
                <!-- Divider -->
                <div class="border-t border-gray-200 my-3"></div>
                
                <!-- Export Format Buttons -->
                <div class="space-y-2">
                    <h4 class="font-medium text-sm mb-2">{{ t('export.formats.title') }}</h4>
                    
                    <!-- Text Format -->
                    <UButton
                        block
                        variant="ghost"
                        color="primary"
                        icon="i-heroicons-document-text"
                        :label="t('export.formats.text')"
                        @click="handleTextExport"
                        class="justify-start"
                    />
                    
                    <!-- Subtitle Format -->
                    <UButton
                        block
                        variant="ghost"
                        color="primary"
                        icon="i-heroicons-chat-bubble-bottom-center-text"
                        :label="t('export.formats.subtitle')"
                        @click="handleSubtitleExport"
                        class="justify-start"
                    />
                    
                    <!-- Json Format -->
                    <UButton
                        block
                        variant="ghost"
                        color="primary"
                        icon="i-heroicons-archive-box"
                        :label="t('export.formats.json')"
                        @click="handleJsonExport"
                        class="justify-start"
                    />
                </div>
            </div>
        </template>
    </UPopover>
</template>
