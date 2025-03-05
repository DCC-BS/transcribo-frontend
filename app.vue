<script setup lang="ts">
import DialogView from './components/DialogView.vue';
import { useInitDialog } from './composables/dialog';

const { isOpen, title, message, onSubmit, onClose } = useInitDialog();

</script>

<template>
    <UApp>
        <NavigationMenu />
        <DialogView :is-open="isOpen" :title="title" :message="message" :on-confirm="onSubmit" :on-cancel="onClose" />
        <NuxtPage />
    </UApp>
</template>