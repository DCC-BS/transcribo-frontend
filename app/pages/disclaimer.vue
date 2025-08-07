<script lang="ts" setup>
import { DisclaimerPage } from "@dcc-bs/common-ui.bs.js";
import disclaimerText from "./assets/disclaimer.html?raw";

definePageMeta({
    layout: false,
});
</script>

<template>
   <DisclaimerPage app-name="Transcribo" :postfixHTML="disclaimerText" confirmation-text="Ich habe die Hinweise gelesen und verstanden und bestätige, dass ich Tanscribo ausschliesslich unter Einhaltung der genannten Richtlinien verwende."/>
</template>
