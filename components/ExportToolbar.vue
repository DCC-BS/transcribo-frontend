<script lang="ts" setup>
const withSpeakers = ref(true);
const { t } = useI18n();
const { exportAsText, exportAsSrt } = useExport();
</script>

<template>
    <div class="flex gap-2 align-middle items-center">
        <USwitch :label="t('export.withSpeakers')" v-model="withSpeakers" />
        <UButton @click="() => exportAsText(withSpeakers)">{{ t('export.exportAsText') }}</UButton>
        <UButton @click="() => exportAsSrt(withSpeakers)">{{ t('export.exportAsSrt') }}</UButton>
    </div>
</template>