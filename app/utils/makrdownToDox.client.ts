/**
 * Converts markdown content to a DOCX file blob
 * @param markdown - The markdown content to convert
 * @returns Promise<Blob> - The generated DOCX file as a blob
 */
export async function markdownToDocx(markdown: string): Promise<Blob> {
    // Ensure this only runs on the client side
    if (typeof window === "undefined") {
        throw new Error("markdownToDocx can only be used on the client side");
    }

    // Dynamic import to prevent SSR issues
    const { convertMarkdownToDocx } = await import("@mohtasham/md-to-docx");

    return await convertMarkdownToDocx(markdown);
}
