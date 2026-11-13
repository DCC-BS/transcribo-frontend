import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EffectScope, effectScope, ref } from "vue";

const routeLeaveGuards: Array<() => boolean | Promise<boolean>> = [];
const openDialog = vi.fn();

vi.mock("vue-router", () => ({
    onBeforeRouteLeave: (guard: () => boolean | Promise<boolean>) =>
        routeLeaveGuards.push(guard),
}));
vi.mock("vue-i18n", () => ({
    useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("../../app/composables/dialog", () => ({
    useDialog: () => ({ openDialog }),
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
            expect.objectContaining({ message: "recording.leave.message" }),
        );
    });
});
