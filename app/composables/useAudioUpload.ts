import { UploadFileCommand } from "~/types/commands";
import type { TaskStatus } from "~/types/task";

export function useAudioUpload() {
    const showProgress = useState<boolean>("showProgress", () => false);
    const progressMessage = useState<string>("progressMessage", () => "");
    const numSpeakers = useState<string>("numSpeakers", () => "auto");
    const audioLanguage = useState<string>("audioLanguage", () => "de");

    const { $api } = useNuxtApp();
    const { t } = useI18n();
    const { executeCommand } = useCommandBus();

    async function uploadFile(
        file: File | Blob,
        originalFile: File,
    ): Promise<void> {
        showProgress.value = true;
        progressMessage.value = t("upload.uploadingMedia");

        const formData = new FormData();
        formData.append("file", file);

        // Add num_speakers parameter - send null for auto detection, otherwise send the integer value
        if (numSpeakers.value === "auto") {
            formData.append("num_speakers", "null");
        } else {
            formData.append("num_speakers", numSpeakers.value);
        }

        // Add audio_language parameter - send null for auto detection, otherwise send the language code
        if (audioLanguage.value === "auto") {
            formData.append("audio_language", "null");
        } else {
            formData.append("audio_language", audioLanguage.value);
        }

        try {
            const response = await $api<TaskStatus>("/api/transcribe/submit", {
                body: formData,
                method: "POST",
            });

            executeCommand(new UploadFileCommand(originalFile, response));
        } catch (error) {
            const toast = useToast();

            // Handle unsupported media type (415) with a friendly toast
            if (isHttpStatusCode(error, 415)) {
                toast.add({
                    title:
                        t("upload.unsupportedFileTypeTitle") ||
                        "Unsupported file type",
                    description:
                        t("upload.unsupportedFileTypeDescription") ||
                        "Allowed file types: mp3, mp4, wav, webm",
                    color: "error",
                    icon: "i-heroicons-exclamation-triangle",
                });
                return;
            }

            // Handle file too large (413) with a friendly toast
            if (isHttpStatusCode(error, 413)) {
                toast.add({
                    title: t("upload.fileTooLargeTitle") || "File too large",
                    description:
                        t("upload.fileTooLargeDescription") ||
                        "The file size exceeds the maximum allowed limit. Please try a smaller file.",
                    color: "error",
                    icon: "i-heroicons-exclamation-triangle",
                });
                return;
            }

            // Handle too many requests (429) with a friendly toast
            if (isHttpStatusCode(error, 429)) {
                toast.add({
                    title:
                        t("upload.tooManyRequestsTitle") || "Too many requests",
                    description:
                        t("upload.tooManyRequestsDescription") ||
                        "You've made too many requests. Please wait a few minutes before trying again.",
                    color: "error",
                    icon: "i-heroicons-clock",
                });
                return;
            }

            throw error;
        } finally {
            // Always stop the progress indicator
            showProgress.value = false;
        }
    }

    return {
        uploadFile,
        showProgress,
        progressMessage,
        numSpeakers,
        audioLanguage,
    };
}
