import { useEventListener } from "@vueuse/core";
import { type MaybeRefOrGetter, toValue } from "vue";
import { useI18n } from "vue-i18n";
import { onBeforeRouteLeave } from "vue-router";
import { useDialog } from "./dialog";

/*
    Leaving the page mid-recording cuts the recording off. The chunks stored
    so far survive in IndexedDB and show up as abandoned recordings, but the
    last seconds are lost and the user has to recover the rest by hand — so
    ask before letting them go.

    Reload and closing the tab/window can only be intercepted through
    `beforeunload`, where browsers show their own fixed wording; the
    in-page warning next to the recorder carries the explanation. Navigating
    inside the app goes through the router and gets our own dialog.
*/
/**
 * Asks for confirmation before the page is reloaded, closed or left while
 * a recording is running.
 *
 * @param isRecording - Whether a recording is currently running.
 */
export function useRecordingLeaveGuard(
    isRecording: MaybeRefOrGetter<boolean>,
): void {
    const { t } = useI18n();
    const { openDialog } = useDialog();

    // no explicit target: VueUse falls back to `window` only in the
    // browser, so this stays safe during server-side rendering
    useEventListener("beforeunload", (event: BeforeUnloadEvent) => {
        if (!toValue(isRecording)) {
            return;
        }
        event.preventDefault();
        // older Chromium versions only prompt when returnValue is set
        event.returnValue = "";
    });

    // a second navigation while the dialog is open replaces its callbacks;
    // settle the first one so it is not left pending forever
    let settlePending: ((leave: boolean) => void) | undefined;

    onBeforeRouteLeave(() => {
        if (!toValue(isRecording)) {
            return true;
        }
        settlePending?.(false);
        return new Promise<boolean>((resolve) => {
            settlePending = resolve;
            const settle = (leave: boolean) => {
                settlePending = undefined;
                resolve(leave);
            };
            openDialog({
                title: t("recording.leave.title"),
                message: t("recording.leave.message"),
                confirmLabel: t("recording.leave.confirm"),
                cancelLabel: t("recording.leave.cancel"),
                onSubmit: () => settle(true),
                onClose: () => settle(false),
            });
        });
    });
}
