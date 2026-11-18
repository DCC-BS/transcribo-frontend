import { useEventListener } from "@vueuse/core";
import { type MaybeRefOrGetter, toValue } from "vue";
import { useI18n } from "vue-i18n";
import { onBeforeRouteLeave } from "vue-router";
import { useDialog } from "./dialog";

// A reload or a closed tab loses the last unsaved seconds and can only be
// caught by `beforeunload`, whose wording browsers fix. In-app navigation
// saves first (`saveBeforeLeave`) and asks only if that fails or while a
// recording is being finished for upload.
/**
 * Asks for confirmation before audio would be lost by leaving the page.
 *
 * @param isRecording - Whether reloading or closing the page now would lose
 *   audio (recording, or a pause still being stored).
 * @param isFinishing - Whether navigating inside the app now would cut off
 *   a recording being finished. Defaults to `isRecording`.
 * @param saveBeforeLeave - Pauses and stores the recording before in-app
 *   navigation; resolves to false if part of it could not be stored.
 */
export function useRecordingLeaveGuard(
    isRecording: MaybeRefOrGetter<boolean>,
    isFinishing: MaybeRefOrGetter<boolean> = isRecording,
    saveBeforeLeave?: () => Promise<boolean>,
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

    function ask(texts: "leave" | "leaveUnsaved"): Promise<boolean> {
        settlePending?.(false);
        return new Promise<boolean>((resolve) => {
            settlePending = resolve;
            const settle = (leave: boolean) => {
                settlePending = undefined;
                resolve(leave);
            };
            openDialog({
                title: t(`recording.${texts}.title`),
                message: t(`recording.${texts}.message`),
                confirmLabel: t("recording.leave.confirm"),
                cancelLabel: t("recording.leave.cancel"),
                onSubmit: () => settle(true),
                onClose: () => settle(false),
            });
        });
    }

    // the newest navigation; an older one's save result is moot
    let navigation = 0;

    onBeforeRouteLeave(async () => {
        const current = ++navigation;
        if (toValue(isFinishing)) {
            return ask("leave");
        }
        // also when no longer busy: a pause may still be saving, or its
        // save may have failed already
        const saved = saveBeforeLeave ? await saveBeforeLeave() : true;
        if (current !== navigation) {
            return false;
        }
        // Stop may have been pressed while the pause was saved
        if (toValue(isFinishing)) {
            return ask("leave");
        }
        if (!saved) {
            return ask("leaveUnsaved");
        }
        // an earlier navigation's dialog is moot now
        if (settlePending) {
            settlePending(false);
            settlePending = undefined;
            closeDialog();
        }
        return true;
    });
}
