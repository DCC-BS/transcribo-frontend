export function isVideoFile(file: File | Blob): boolean {
    return file.type.startsWith("video/");
}
