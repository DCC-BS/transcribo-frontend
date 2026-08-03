<script setup lang="ts">
import type { DisclaimerConfig } from "@dcc-bs/common-ui.bs.js/types";
import { useEventListener } from "@vueuse/core";
import { NuxtLayout } from "#components";
import disclaimerText from "~/assets/disclaimer.html?raw";
import DialogView from "~/components/DialogView.vue";
import { useInitDialog } from "~/composables/dialog";

const disclaimerConfig: DisclaimerConfig = {
    appName: "Transcribo",
    postfixHtml: disclaimerText,
    confirmationText:
        "Ich habe die Hinweise gelesen und verstanden und bestätige, dass ich Transcribo ausschliesslich unter Einhaltung der genannten Richtlinien verwende.",
    // bumping this re-arms the disclaimer gate for every user
    version: "1.0.0",
};

// The tour drives the routes it needs itself, so it is built here instead of
// on a single page.
const onboardingBuilder = useTranscriboTour();

const { isOpen, title, message, onSubmit, onClose } = useInitDialog();
const { undo, redo, canUndo, canRedo } = useCommandHistory();

useEventListener("keydown", handleKeyDown);

/**
 * Global undo/redo shortcuts (Ctrl+Z / Ctrl+Y).
 *
 * @param event - The keyboard event.
 */
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
    <FirstRunOrchestrator
        :disclaimer="disclaimerConfig"
        :onboarding-builder="onboardingBuilder"
    />
    <UApp>
        <DialogView
            :is-open="isOpen"
            :title="title"
            :message="message"
            :on-confirm="onSubmit"
            :on-cancel="onClose"
        />
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>
