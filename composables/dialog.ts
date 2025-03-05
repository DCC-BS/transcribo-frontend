const _isOpen = ref(false);
const _title = ref('');
const _message = ref('');

const _closeCallback = ref<() => void>();
const _submitCallaback = ref<() => void>();

const onClose = () => {
    _isOpen.value = false;
    _closeCallback.value?.();
};

const onSubmit = () => {
    _isOpen.value = false;
    _submitCallaback.value?.();
}

export function useInitDialog() {
    return { isOpen: _isOpen, title: _title, message: _message, onSubmit, onClose };
}

export function useDialog() {
    function openDialog(input: { title?: string, message: string, onClose?: () => void, onSubmit?: () => void }) {
        const { title, message, onClose, onSubmit } = input;

        _closeCallback.value = onClose;
        _submitCallaback.value = onSubmit;
        _title.value = title ?? '';
        _message.value = message ?? '';
        _isOpen.value = true;
    }

    return { openDialog };
}