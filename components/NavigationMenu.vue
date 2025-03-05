<script lang="ts" setup>
import { UNavigationMenu } from '#components';

const items = ref([
    {
        label: 'New',
        to: '/',
        icon: 'i-heroicons-plus',
    },
    {
        label: 'Transcriptions',
        to: '/transcription',
        icon: 'i-heroicons-queue-list',
    }
]);
</script>

<template>
    <UNavigationMenu :items="items" class="w-full justify-center" />
</template>