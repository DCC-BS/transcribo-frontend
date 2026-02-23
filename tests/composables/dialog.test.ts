import { describe, expect, it, vi, beforeEach } from "vitest";
import { useDialog, useInitDialog } from "../../../app/composables/dialog";

describe("dialog composable", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("useDialog", () => {
        it("should open dialog with message", () => {
            const { openDialog } = useDialog();
            const { isOpen, message } = useInitDialog();

            expect(isOpen.value).toBe(false);

            openDialog({ message: "Test message" });

            expect(isOpen.value).toBe(true);
            expect(message.value).toBe("Test message");
        });

        it("should open dialog with title and message", () => {
            const { openDialog } = useDialog();
            const { isOpen, title, message } = useInitDialog();

            openDialog({ title: "Test Title", message: "Test message" });

            expect(isOpen.value).toBe(true);
            expect(title.value).toBe("Test Title");
            expect(message.value).toBe("Test message");
        });

        it("should store onClose callback", () => {
            const { openDialog } = useDialog();
            const onClose = vi.fn();

            openDialog({ message: "Test", onClose });

            const { onClose: dialogOnClose } = useInitDialog();
            dialogOnClose();

            expect(onClose).toHaveBeenCalled();
        });

        it("should store onSubmit callback", () => {
            const { openDialog } = useDialog();
            const onSubmit = vi.fn();

            openDialog({ message: "Test", onSubmit });

            const { onSubmit: dialogOnSubmit } = useInitDialog();
            dialogOnSubmit();

            expect(onSubmit).toHaveBeenCalled();
        });

        it("should close dialog on onClose", () => {
            const { openDialog } = useDialog();
            const { isOpen, onClose } = useInitDialog();

            openDialog({ message: "Test" });
            expect(isOpen.value).toBe(true);

            onClose();

            expect(isOpen.value).toBe(false);
        });

        it("should close dialog on onSubmit", () => {
            const { openDialog } = useDialog();
            const { isOpen, onSubmit } = useInitDialog();

            openDialog({ message: "Test" });
            expect(isOpen.value).toBe(true);

            onSubmit();

            expect(isOpen.value).toBe(false);
        });

        it("should use empty string as default title", () => {
            const { openDialog } = useDialog();
            const { title } = useInitDialog();

            openDialog({ message: "Test" });

            expect(title.value).toBe("");
        });
    });

    describe("useInitDialog", () => {
        it("should return reactive refs", () => {
            const { isOpen, title, message, onSubmit, onClose } = useInitDialog();

            expect(isOpen.value).toBeDefined();
            expect(title.value).toBeDefined();
            expect(message.value).toBeDefined();
            expect(typeof onSubmit).toBe("function");
            expect(typeof onClose).toBe("function");
        });
    });
});
