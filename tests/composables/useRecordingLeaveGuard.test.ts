import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EffectScope, effectScope, ref } from "vue";

const routeLeaveGuards: Array<() => boolean | Promise<boolean>> = [];
const openDialog = vi.fn();
const closeDialog = vi.fn();

vi.mock("vue-router", () => ({
    onBeforeRouteLeave: (guard: () => boolean | Promise<boolean>) =>
        routeLeaveGuards.push(guard),
}));
vi.mock("vue-i18n", () => ({
    useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("../../app/composables/dialog", () => ({
    useDialog: () => ({ openDialog, closeDialog }),
}));

const { useRecordingLeaveGuard } = await import(
    "../../app/composables/useRecordingLeaveGuard"
);

/**
 * Fires a cancelable beforeunload, as a reload or tab close would.
 *
 * @returns Whether the page asked the browser to confirm leaving.
 */
function reload(): boolean {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
}

describe("useRecordingLeaveGuard", () => {
    const isRecording = ref(false);
    let scope: EffectScope;

    beforeEach(() => {
        isRecording.value = false;
        routeLeaveGuards.length = 0;
        openDialog.mockReset();
        scope = effectScope();
        scope.run(() => useRecordingLeaveGuard(isRecording));
    });

    afterEach(() => scope.stop());

    it("lets a reload through while nothing is recorded", () => {
        expect(reload()).toBe(false);
    });

    it("asks before a reload or close while recording", () => {
        isRecording.value = true;
        expect(reload()).toBe(true);
    });

    it("stops asking once the component is gone", () => {
        isRecording.value = true;
        scope.stop();
        expect(reload()).toBe(false);
    });

    it("lets in-app navigation through while nothing is recorded", async () => {
        expect(await routeLeaveGuards[0]?.()).toBe(true);
        expect(openDialog).not.toHaveBeenCalled();
    });

    it("leaves only when the user confirms the dialog", async () => {
        isRecording.value = true;

        openDialog.mockImplementationOnce(({ onSubmit }) => onSubmit());
        expect(await routeLeaveGuards[0]?.()).toBe(true);

        openDialog.mockImplementationOnce(({ onClose }) => onClose());
        expect(await routeLeaveGuards[0]?.()).toBe(false);

        expect(openDialog).toHaveBeenLastCalledWith(
            expect.objectContaining({
                message: "recording.leave.message",
                confirmLabel: "recording.leave.confirm",
                cancelLabel: "recording.leave.cancel",
            }),
        );
    });

    it("settles a pending navigation when a second one asks", async () => {
        isRecording.value = true;

        // the dialog is left open: neither callback fires
        const first = routeLeaveGuards[0]?.();
        const second = routeLeaveGuards[0]?.();

        expect(await first).toBe(false);
        openDialog.mock.calls[1]?.[0].onSubmit();
        expect(await second).toBe(true);
    });
});

describe("useRecordingLeaveGuard with a separate finishing state", () => {
    const isRecording = ref(false);
    const isFinishing = ref(false);
    let scope: EffectScope;

    beforeEach(() => {
        isRecording.value = false;
        isFinishing.value = false;
        routeLeaveGuards.length = 0;
        openDialog.mockReset();
        scope = effectScope();
        scope.run(() => useRecordingLeaveGuard(isRecording, isFinishing));
    });

    afterEach(() => scope.stop());

    it("lets in-app navigation through while recording", async () => {
        // unmounting the recorder pauses and stores the recording
        isRecording.value = true;
        expect(await routeLeaveGuards[0]?.()).toBe(true);
        expect(openDialog).not.toHaveBeenCalled();
        // a reload still loses the last seconds
        expect(reload()).toBe(true);
    });

    it("asks before in-app navigation while finishing", async () => {
        isFinishing.value = true;
        openDialog.mockImplementationOnce(({ onClose }) => onClose());
        expect(await routeLeaveGuards[0]?.()).toBe(false);
    });

    it("answers and closes a moot dialog once finishing is over", async () => {
        isFinishing.value = true;
        closeDialog.mockReset();
        // the dialog is left open: neither callback fires
        const first = routeLeaveGuards[0]?.();

        isFinishing.value = false;
        expect(await routeLeaveGuards[0]?.()).toBe(true);

        expect(await first).toBe(false);
        expect(closeDialog).toHaveBeenCalledOnce();
    });
});

describe("useRecordingLeaveGuard saving before in-app navigation", () => {
    const isRecording = ref(false);
    const isFinishing = ref(false);
    const save = vi.fn<() => Promise<boolean>>();
    let scope: EffectScope;

    beforeEach(() => {
        isRecording.value = false;
        isFinishing.value = false;
        routeLeaveGuards.length = 0;
        openDialog.mockReset();
        save.mockReset();
        scope = effectScope();
        scope.run(() => useRecordingLeaveGuard(isRecording, isFinishing, save));
    });

    afterEach(() => scope.stop());

    it("leaves without asking once the recording is saved", async () => {
        isRecording.value = true;
        save.mockResolvedValueOnce(true);
        expect(await routeLeaveGuards[0]?.()).toBe(true);
        expect(save).toHaveBeenCalledOnce();
        expect(openDialog).not.toHaveBeenCalled();
    });

    it("asks when part of the recording could not be saved", async () => {
        isRecording.value = true;
        save.mockResolvedValue(false);

        openDialog.mockImplementationOnce(({ onClose }) => onClose());
        expect(await routeLeaveGuards[0]?.()).toBe(false);
        expect(openDialog).toHaveBeenLastCalledWith(
            expect.objectContaining({
                title: "recording.leaveUnsaved.title",
                message: "recording.leaveUnsaved.message",
            }),
        );

        openDialog.mockImplementationOnce(({ onSubmit }) => onSubmit());
        expect(await routeLeaveGuards[0]?.()).toBe(true);
    });

    it("leaves without asking when nothing is recorded", async () => {
        save.mockResolvedValueOnce(true);
        expect(await routeLeaveGuards[0]?.()).toBe(true);
        expect(openDialog).not.toHaveBeenCalled();
    });

    it("asks when an earlier pause already failed to save", async () => {
        // not busy any more, but the last part is missing
        save.mockResolvedValueOnce(false);
        openDialog.mockImplementationOnce(({ onClose }) => onClose());
        expect(await routeLeaveGuards[0]?.()).toBe(false);
        expect(openDialog).toHaveBeenLastCalledWith(
            expect.objectContaining({ title: "recording.leaveUnsaved.title" }),
        );
    });

    it("asks when finishing began while the pause was saved", async () => {
        isRecording.value = true;
        let saved: (ok: boolean) => void = () => {};
        save.mockImplementationOnce(
            () => new Promise<boolean>((resolve) => (saved = resolve)),
        );
        openDialog.mockImplementationOnce(({ onClose }) => onClose());

        const leaving = routeLeaveGuards[0]?.();
        isFinishing.value = true;
        saved(true);

        expect(await leaving).toBe(false);
        expect(openDialog).toHaveBeenLastCalledWith(
            expect.objectContaining({ title: "recording.leave.title" }),
        );
    });

    it("ignores the save result of a superseded navigation", async () => {
        isRecording.value = true;
        let firstSaved: (ok: boolean) => void = () => {};
        save.mockImplementationOnce(
            () => new Promise<boolean>((resolve) => (firstSaved = resolve)),
        );
        save.mockResolvedValueOnce(true);

        const first = routeLeaveGuards[0]?.();
        const second = routeLeaveGuards[0]?.();
        expect(await second).toBe(true);
        firstSaved(false);

        expect(await first).toBe(false);
        expect(openDialog).not.toHaveBeenCalled();
    });
});

