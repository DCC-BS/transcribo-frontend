<script setup lang="ts">
// The package's ./types entry does not re-export the onboarding types yet.
import type {
    OnboardingStep,
    StepPopoverOverride,
} from "@dcc-bs/common-ui.bs.js/runtime/types/onboarding.js";
import { ChangeEditorModeCommand } from "~/types/commands";
import type { EditorMode } from "~/types/editor";

type StepOptions = Pick<OnboardingStep, "element" | "onHighlightStarted"> &
    Pick<StepPopoverOverride, "side" | "align">;

const { t } = useI18n();
const { executeCommand } = useCommandBus();

const dockCompact = useEditorDockCompact();

const { addPhases } = useOnboardingBuilder({
    showProgress: true,
    nextBtnText: t("onboarding.next"),
    prevBtnText: t("onboarding.previous"),
    doneBtnText: t("onboarding.done"),
    progressText: t("onboarding.progress"),
});

/**
 * Builds a step whose popover texts come from `onboarding.<key>.title` and
 * `onboarding.<key>.description`.
 *
 * @param key - The i18n key of the step.
 * @param options - Highlighted element, hooks and popover placement.
 */
function step(key: string, options: StepOptions): OnboardingStep {
    const { side, align, ...driveStep } = options;

    return {
        ...driveStep,
        popover: {
            title: () => t(`onboarding.${key}.title`),
            description: () => t(`onboarding.${key}.description`),
            side,
            align,
        },
    };
}

/*
    Every editor mode is a phase: the builder switches the mode when the user
    steps into it and switches back when they step out, so walking the tour
    backwards lands in the same editor state as walking it forwards.
*/
const builder = addPhases<EditorMode>(
    (["view", "summary", "edit", "statistics"] as const).map((mode) => ({
        name: mode,
        onEnter: () => executeCommand(new ChangeEditorModeCommand(mode)),
    })),
)
    .switchPhase("view")
    .addSteps([
        step("welcome", { side: "bottom", align: "center" }),
        step("transcriptionInfo", {
            element: "#transcription-info-button",
            side: "bottom",
            align: "start",
        }),
        step("exportToolbar", {
            element: "#export-toolbar",
            side: "bottom",
            align: "end",
        }),
        step("modes", {
            element: "#editor-mode-selector",
            side: "bottom",
            align: "center",
        }),
        step("viewerIntro", {
            element: ".mode-view",
            side: "bottom",
            align: "center",
        }),
        step("viewerDisplayOptions", {
            element: "#viewer-display-options",
            side: "bottom",
            align: "start",
        }),
    ])
    .switchPhase("summary")
    .addSteps([
        step("summary", {
            element: ".mode-summary",
            side: "bottom",
            align: "center",
        }),
        step("generateSummary", {
            element: "#generate-summary-button",
            side: "bottom",
            align: "start",
        }),
    ])
    .switchPhase("edit")
    .addSteps([
        step("editor", { element: ".mode-edit", side: "bottom", align: "center" }),
        step("editTranscriptions", {
            element: "#transcript-document",
            /*
                The lanes and the segment button only exist while the dock is
                expanded, and it starts collapsed on phones. Expanding here,
                one step before they are pointed at, is the only window that
                works: driver.js resolves a step's element before running its
                own onHighlightStarted, and expanding any earlier is undone by
                EditorDock re-collapsing itself when it mounts below 640px.
            */
            onHighlightStarted: () => {
                dockCompact.value = false;
            },
            side: "top",
            align: "center",
        }),
        step("speakerLanes", {
            element: "#editor-lanes",
            side: "top",
            align: "center",
        }),
        step("addTranscription", {
            element: "#dock-add-segment",
            side: "top",
            align: "start",
        }),
        step("mediaPlayback", {
            element: "#media-play-button",
            side: "top",
            align: "center",
        }),
    ])
    .switchPhase("statistics")
    .addSteps([
        step("statistics", {
            element: ".mode-statistics",
            side: "bottom",
            align: "center",
        }),
        step("speakerStatistics", {
            element: "#speaker-statistics",
            side: "left",
            align: "start",
        }),
        step("complete", { side: "bottom", align: "center" }),
    ]);

useOnboardingTour(builder);
</script>

<template>
    <!-- Renderless: hands the tour to FirstRunOrchestrator, no DOM of its own -->
    <span hidden aria-hidden="true" />
</template>
