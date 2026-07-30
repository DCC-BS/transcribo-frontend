// The package's ./types entry does not re-export the onboarding types yet.
import type { OnboadingStepBuilder } from "@dcc-bs/common-ui.bs.js/runtime/types/onboarding.js";
import { createInjectionState } from "@vueuse/core";
import type { EditorMode } from "~/types/editor";

/** A tour, phased along the editor modes it walks through. */
export type TranscriboTour = OnboadingStepBuilder<EditorMode>;

const [provideOnboardingTour, injectOnboardingTour] = createInjectionState(() =>
    shallowRef<TranscriboTour>(),
);

export { provideOnboardingTour };

/**
 * Hands a tour to the FirstRunOrchestrator in app.vue for as long as the
 * calling component is mounted.
 *
 * @param tour - The tour to run while the component lives.
 */
export function useOnboardingTour(tour: TranscriboTour): void {
    const slot = injectOnboardingTour();
    if (!slot) {
        return;
    }

    slot.value = tour;
    onScopeDispose(() => {
        slot.value = undefined;
    });
}
