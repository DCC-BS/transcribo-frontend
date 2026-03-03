<script setup lang="ts">
import { type Driver, driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useMediaQuery } from "@vueuse/core";
import {
    ChangeEditorModeCommand,
    Cmds,
    type ShowOnboardingCommand,
} from "~/types/commands";

const emit = defineEmits<{
    start: [];
    complete: [];
}>();

const { t } = useI18n();
const { executeCommand, onCommand } = useCommandBus();

const ONBOARDING_KEY = "transcribo-onboarding-completed";
const isMobile = useMediaQuery("(max-width: 768px)");

async function switchToMode(mode: "view" | "summary" | "edit" | "statistics") {
    await executeCommand(new ChangeEditorModeCommand(mode));
}

function getSelector(baseId: string): string {
    return isMobile.value ? `#mobile-${baseId}` : `#desktop-${baseId}`;
}

function createDriver() {
    return driver({
        showProgress: true,
        nextBtnText: t("onboarding.next"),
        prevBtnText: t("onboarding.previous"),
        doneBtnText: t("onboarding.done"),
        progressText: t("onboarding.progress"),
        onDestroyStarted: () => {
            localStorage.setItem(ONBOARDING_KEY, "true");
            emit("complete");
            driverObj.value?.destroy();
        },
        steps: [
            {
                popover: {
                    title: t("onboarding.welcome.title"),
                    description: t("onboarding.welcome.description"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: "#transcription-info-button",
                popover: {
                    title: t("onboarding.transcriptionInfo.title"),
                    description: t("onboarding.transcriptionInfo.description"),
                    side: "bottom",
                    align: "start",
                },
            },
            {
                element: "#export-toolbar",
                popover: {
                    title: t("onboarding.exportToolbar.title"),
                    description: t("onboarding.exportToolbar.description"),
                    side: "bottom",
                    align: "end",
                },
            },
            {
                element: getSelector("editor-mode-selector"),
                popover: {
                    title: t("onboarding.modes.title"),
                    description: t("onboarding.modes.description"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: getSelector("mode-view"),
                popover: {
                    title: t("onboarding.viewerIntro.title"),
                    description: t("onboarding.viewerIntro.description"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: "#viewer-display-options",
                onHighlightStarted: () => switchToMode("view"),
                popover: {
                    title: t("onboarding.viewerDisplayOptions.title"),
                    description: t(
                        "onboarding.viewerDisplayOptions.description",
                    ),
                    side: "bottom",
                    align: "start",
                },
            },
            {
                element: getSelector("mode-summary"),
                onHighlightStarted: async () => await switchToMode("summary"),
                popover: {
                    title: t("onboarding.summary.title"),
                    description: t("onboarding.summary.description"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: "#generate-summary-button",
                popover: {
                    title: t("onboarding.generateSummary.title"),
                    description: t("onboarding.generateSummary.description"),
                    side: "bottom",
                    align: "start",
                },
            },
            {
                element: getSelector("mode-edit"),
                onHighlightStarted: () => switchToMode("edit"),
                popover: {
                    onPrevClick: async () => {
                        switchToMode("summary");
                        driverObj.value?.movePrevious();
                    },
                    title: t("onboarding.editor.title"),
                    description: t("onboarding.editor.description"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: "#speaker-names-section",
                popover: {
                    title: t("onboarding.speakerNames.title"),
                    description: t("onboarding.speakerNames.description"),
                    side: "bottom",
                    align: "start",
                },
            },
            {
                element: "#transcription-segments",
                popover: {
                    title: t("onboarding.editTranscriptions.title"),
                    description: t("onboarding.editTranscriptions.description"),
                    side: "top",
                    align: "start",
                },
            },
            {
                element: "#add-transcription-top",
                popover: {
                    title: t("onboarding.addTranscription.title"),
                    description: t("onboarding.addTranscription.description"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: "#media-playback-bar",
                popover: {
                    title: t("onboarding.mediaPlayback.title"),
                    description: t("onboarding.mediaPlayback.description"),
                    side: "bottom",
                    align: "start",
                },
            },
            {
                element: "#media-expand-button-collapsed",
                popover: {
                    title: t("onboarding.mediaExpand.title"),
                    description: t("onboarding.mediaExpand.description"),
                    side: "bottom",
                    align: "start",
                },
            },
            {
                element: getSelector("mode-statistics"),
                onHighlightStarted: () => switchToMode("statistics"),
                popover: {
                    onPrevClick: async () => {
                        await switchToMode("edit");
                        driverObj.value?.movePrevious();
                    },
                    title: t("onboarding.statistics.title"),
                    description: t("onboarding.statistics.description"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                element: "#speaker-statistics",
                popover: {
                    title: t("onboarding.speakerStatistics.title"),
                    description: t("onboarding.speakerStatistics.description"),
                    side: "left",
                    align: "start",
                },
            },
            {
                element: "#help-button",
                popover: {
                    title: t("onboarding.helpButton.title"),
                    description: t("onboarding.helpButton.description"),
                    side: "bottom",
                    align: "center",
                },
            },
            {
                popover: {
                    title: t("onboarding.complete.title"),
                    description: t("onboarding.complete.description"),
                    side: "bottom",
                    align: "center",
                },
            },
        ],
    });
}

const driverObj = ref<Driver>();

function start(): void {
    driverObj.value = createDriver();
    emit("start");
    switchToMode("view");
    driverObj.value?.drive();
}

function isCompleted(): boolean {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
}

function reset(): void {
    localStorage.removeItem(ONBOARDING_KEY);
}

defineExpose({
    start,
    isCompleted,
    reset,
});

onMounted(() => {
    if (!isCompleted()) {
        start();
    }
});

onCommand<ShowOnboardingCommand>(Cmds.ShowOnboardingCommand, async () => {
    if (isCompleted()) {
        reset();
    }
    start();
});
</script>

<template></template>
