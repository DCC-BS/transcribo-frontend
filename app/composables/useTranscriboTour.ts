// The package's ./types entry does not re-export the onboarding types yet.
import type {
    OnboadingStepBuilder,
    OnboardingStep,
    StepPopoverOverride,
} from "@dcc-bs/common-ui.bs.js/runtime/types/onboarding.js";
import { ChangeEditorModeCommand } from "~/types/commands";
import type { EditorMode } from "~/types/editor";
import {
    ensureTutorialTranscription,
    removeTutorialTranscription,
    TUTORIAL_TRANSCRIPTION_ID,
} from "~/utils/tutorialTranscription";

/**
 * The states the tour walks through: the transcription overview, the upload
 * page, and the editor once per mode.
 */
export type TourPhase = "home" | "upload" | EditorMode;

/** A tour, phased along the app states it walks through. */
export type TranscriboTour = OnboadingStepBuilder<TourPhase>;

type StepOptions = Pick<OnboardingStep, "element" | "onHighlightStarted"> &
    Pick<StepPopoverOverride, "side" | "align">;

const TUTORIAL_PATH = `/transcription/${TUTORIAL_TRANSCRIPTION_ID}`;

/**
 * Builds the Transcribo onboarding tour for `<FirstRunOrchestrator>`.
 *
 * The tour walks the whole app rather than a single page: it starts on the
 * transcription overview, visits the upload page, and then opens a mockup
 * transcription (see `~/utils/tutorialTranscription`) in every editor mode,
 * so it can run before the user has transcribed anything.
 *
 * @returns The tour to hand to the orchestrator's `onboarding-builder` prop.
 */
export function useTranscriboTour(): TranscriboTour {
    const { t, locale } = useI18n();
    const { executeCommand } = useCommandBus();
    const router = useRouter();
    const logger = useLogger();

    const dockCompact = useEditorDockCompact();

    const { addPhases } = useOnboardingBuilder({
        showProgress: true,
        nextBtnText: t("onboarding.next"),
        prevBtnText: t("onboarding.previous"),
        doneBtnText: t("onboarding.done"),
        progressText: t("onboarding.progress"),
        // Fires for a completed as well as a cancelled tour: the mockup entry
        // must not outlive the tour that created it.
        onDestroyed: () => {
            void endTour();
        },
    });

    /**
     * Waits until a selector resolves, so a step never points at DOM that the
     * page it just navigated to has not rendered yet.
     *
     * @param selector - The element to wait for.
     * @param timeoutMs - How long to wait before giving up.
     */
    async function waitForElement(selector: string, timeoutMs = 5000) {
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            if (document.querySelector(selector)) {
                await nextTick();
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        logger.warn(`Onboarding: "${selector}" did not appear in time`);
    }

    /**
     * Navigates to a page of the tour and waits for its anchor element.
     *
     * @param path - The route to show.
     * @param selector - Anchor element that marks the page as ready.
     */
    async function goTo(path: string, selector: string) {
        if (router.currentRoute.value.path !== path) {
            await router.push(path);
        }
        await waitForElement(selector);
    }

    /**
     * Opens the tutorial transcription in the given editor mode, creating the
     * mockup entry on the first visit.
     *
     * @param mode - The editor mode to switch to.
     */
    async function openTutorial(mode: EditorMode) {
        await ensureTutorialTranscription(locale.value);
        await goTo(TUTORIAL_PATH, "#editor-mode-selector");
        await executeCommand(new ChangeEditorModeCommand(mode));
    }

    /**
     * Cleans up after the tour: drops the mockup entry and leaves its page.
     */
    async function endTour() {
        if (router.currentRoute.value.path === TUTORIAL_PATH) {
            await router.push("/");
        }
        await removeTutorialTranscription();
    }

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
        Every phase switches the app into the state its steps need — route for
        the overview and the upload page, route plus editor mode for the editor
        ones. The builder runs the switch when the user steps into a phase and
        the previous phase's switch when they step out, so walking the tour
        backwards lands in the same state as walking it forwards.
    */
    return addPhases<TourPhase>([
        {
            name: "home",
            onEnter: () => goTo("/", "#new-transcription-button"),
        },
        {
            name: "upload",
            onEnter: () => goTo("/new-transcription", "#upload-media-card"),
        },
        ...(["view", "summary", "edit", "statistics"] as const).map((mode) => ({
            name: mode,
            onEnter: () => openTutorial(mode),
        })),
    ])
        .switchPhase("home")
        .addSteps([
            step("welcome", { side: "bottom", align: "center" }),
            step("transcriptionList", {
                element: "#transcription-table",
                side: "top",
                align: "center",
            }),
            step("newTranscription", {
                element: "#new-transcription-button",
                side: "bottom",
                align: "end",
            }),
        ])
        .switchPhase("upload")
        .addSteps([
            step("uploadMedia", {
                element: "#upload-media-card",
                side: "right",
                align: "start",
            }),
            step("recordAudio", {
                element: "#record-audio-control",
                side: "left",
                align: "center",
            }),
            step("recordMeeting", {
                element: "#record-meeting-control",
                side: "left",
                align: "center",
            }),
            step("backHome", {
                element: "#appbar-home-link",
                side: "bottom",
                align: "start",
            }),
        ])
        .switchPhase("view")
        .addSteps([
            step("tutorialTranscription", { side: "bottom", align: "center" }),
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
            step("editor", {
                element: ".mode-edit",
                side: "bottom",
                align: "center",
            }),
            step("editTranscriptions", {
                element: "#transcript-document",
                /*
                    The lanes and the segment button only exist while the dock
                    is expanded, and it starts collapsed on phones. Expanding
                    here, one step before they are pointed at, is the only
                    window that works: the tour resolves a step's element
                    before running its own onHighlightStarted, and expanding
                    any earlier is undone by EditorDock re-collapsing itself
                    when it mounts below 640px.
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
}
