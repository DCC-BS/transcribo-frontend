const _isOpen = ref(false);
const _title = ref("");
const _message = ref("");
const _confirmLabel = ref<string>();
const _cancelLabel = ref<string>();

const _closeCallback = ref<() => void>();
const _submitCallaback = ref<() => void>();

const onClose = () => {
    _isOpen.value = false;
    _closeCallback.value?.();
};

const onSubmit = () => {
    _isOpen.value = false;
    _submitCallaback.value?.();
};

export function useInitDialog() {
    return {
        isOpen: _isOpen,
        title: _title,
        message: _message,
        confirmLabel: _confirmLabel,
        cancelLabel: _cancelLabel,
        onSubmit,
        onClose,
    };
}

export function useDialog() {
    function openDialog(input: {
        title?: string;
        message: string;
        /** Button labels; default to the generic confirm/cancel. */
        confirmLabel?: string;
        cancelLabel?: string;
        onClose?: () => void;
        onSubmit?: () => void;
    }) {
        const { title, message, confirmLabel, cancelLabel, onClose, onSubmit } =
            input;

        _closeCallback.value = onClose;
        _submitCallaback.value = onSubmit;
        _title.value = title ?? "";
        _message.value = message ?? "";
        _confirmLabel.value = confirmLabel;
        _cancelLabel.value = cancelLabel;
        _isOpen.value = true;
    }

    return { openDialog };
}
