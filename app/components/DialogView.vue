<script lang="ts" setup>
interface DialogViewProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

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
            <UButton label="Cancel" @click="handleCancel">Cancel</UButton>
            <UButton label="Submit" @click="handleConfirm">Confirm</UButton>
        </template>
    </UModal>
</template>
