<script setup lang="ts">
import disclaimerText from "./assets/disclaimer.html?raw";
import DialogView from "./components/DialogView.vue";
import { useInitDialog } from "./composables/dialog";

const { isOpen, title, message, onSubmit, onClose } = useInitDialog();
const { undo, redo, canUndo, canRedo, undoStack } = useCommandHistory();

onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
});

function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "z" && event.ctrlKey && canUndo.value) {
        undo();
    }

    if (event.key === "y" && event.ctrlKey && canRedo.value) {
        redo();
    }
}
</script>

<template>
    <NuxtPwaManifest />
    <FeedbackControl />
    <Disclaimer app-name="Transcribo" :postfixHTML="disclaimerText" confirmation-text="Ich habe die Hinweise gelesen und verstanden und bestätige, dass ich Tanscribo ausschliesslich unter Einhaltung der genannten Richtlinien verwende."/>
    <UApp>
        <NavigationMenu />
        <DialogView
            :is-open="isOpen"
            :title="title"
            :message="message"
            :on-confirm="onSubmit"
            :on-cancel="onClose"
        />
        <NuxtPage />
    </UApp>
</template>