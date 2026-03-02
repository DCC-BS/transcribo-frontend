<script lang="ts" setup>
import disclaimerTextRaw from "../assets/disclaimer.html?raw";

const disclaimerText = disclaimerTextRaw as string;

definePageMeta({
    layout: false,
});
</script>

<template>
    <Disclaimer
        appName="Transcribo"
        :postfixHTML="disclaimerText"
        confirmationText="Ich habe die Hinweise gelesen und verstanden und bestätige, dass ich Transcribo ausschliesslich unter Einhaltung der genannten Richtlinien verwende."
    />
</template>
