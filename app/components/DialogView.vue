<script lang="ts" setup>
interface DialogViewProps {
    isOpen: boolean;
    title: string;
    message: string;
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
    <UModal v-model:open="props.isOpen">
        <template #title>{{ props.title }}</template>
        <template #body>{{ props.message }}</template>
        <template #footer>
            <UButton color="neutral" :label="t('ui.cancel')" @click="handleCancel" />
            <UButton color="error" :label="t('ui.confirm')" @click="handleConfirm" />
        </template>
    </UModal>
</template>
