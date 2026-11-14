<script lang="ts" setup>
interface DialogViewProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const { t } = useI18n();

const props = defineProps<DialogViewProps>();

function handleCancel() {
    props.onCancel();
}

function handleConfirm() {
    props.onConfirm();
}
</script>

<template>
    <!-- props are read-only: Escape or an overlay click counts as cancel -->
    <UModal :open="props.isOpen" @update:open="(open) => !open && handleCancel()">
        <template #title>{{ props.title }}</template>
        <template #body>{{ props.message }}</template>
        <template #footer>
            <UButton color="neutral" :label="props.cancelLabel ?? t('ui.cancel')" @click="handleCancel" />
            <UButton color="error" :label="props.confirmLabel ?? t('ui.confirm')" @click="handleConfirm" />
        </template>
    </UModal>
</template>
