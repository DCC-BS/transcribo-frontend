import { useEventListener } from "@vueuse/core";
import { type MaybeRefOrGetter, toValue } from "vue";
import { useI18n } from "vue-i18n";
import { onBeforeRouteLeave } from "vue-router";
import { useDialog } from "./dialog";

/*
    Reloading or closing the page mid-recording cuts the recording off: the
    chunks stored so far survive in IndexedDB and the recording can be
    continued, but the last seconds were never stored. That can only be
    intercepted through `beforeunload`, where browsers show their own fixed
    wording; the in-page warning next to the recorder carries the
    explanation.

    Navigating inside the app is different: the page stays alive, so the
    recorder pauses and stores everything before it goes away. Only a
    recording that is being finished (joined for upload) would end up
    among the abandoned recordings instead of being uploaded, so the router
    asks with our own dialog only then.
*/
/**
 * Asks for confirmation before audio would be lost by leaving the page.
 *
 * @param isRecording - Whether reloading or closing the page now would lose
 *   audio (recording, or a pause still being stored).
 * @param isFinishing - Whether navigating inside the app now would cut off
 *   a recording being finished. Defaults to `isRecording`.
 */
export function useRecordingLeaveGuard(
    isRecording: MaybeRefOrGetter<boolean>,
    isFinishing: MaybeRefOrGetter<boolean> = isRecording,
): void {
    const { t } = useI18n();
    const { openDialog, closeDialog } = useDialog();

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
        if (!toValue(isFinishing)) {
            // an earlier navigation still asking is moot now: answer it and
            // take its dialog down
            if (settlePending) {
                settlePending(false);
                settlePending = undefined;
                closeDialog?.();
            }
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
