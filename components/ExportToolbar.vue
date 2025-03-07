<script lang="ts" setup>

const withSpeakers = ref(true);

const { exportAsText, exportAsSrt } = useExport();

</script>

<template>
    <USwitch label="With speakers" v-model="withSpeakers" />
    <div class="flex">
        <UButton @click="() => exportAsText(withSpeakers)">Export as text</UButton>
        <UButton @click="() => exportAsSrt(withSpeakers)">Export as rtf</UButton>
    </div>
</template>

<style></style>