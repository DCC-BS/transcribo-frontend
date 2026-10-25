import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { markdownToDocx } from "~/utils/markdownToDocx.client";

async function documentXml(markdown: string): Promise<string> {
    const blob = await markdownToDocx(markdown);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) {
        throw new Error("word/document.xml missing from the exported docx");
    }
    return xml;
}

describe("markdownToDocx", () => {
    // Same shape as useExport's Word export: title, summary, transcript with bold speakers.
    const markdown = [
        "# Sitzung vom 3. März",
        "## Meeting Summary",
        "Kurze Zusammenfassung.",
        "---",
        "## Transcript",
        "**Sprecher 1:** Guten Morgen zusammen.",
        "**Sprecher 2:** Hallo!",
    ].join("\n\n");

    it("keeps headings and transcript text", async () => {
        const xml = await documentXml(markdown);

        expect(xml).toContain("Sitzung vom 3. März");
        expect(xml).toContain("Meeting Summary");
        expect(xml).toContain("Guten Morgen zusammen.");
        expect(xml).toContain("Hallo!");
    });

    it("renders speaker labels in bold", async () => {
        const xml = await documentXml(markdown);
        const speakerRun = xml.match(/<w:r>(?:(?!<\/w:r>).)*Sprecher 1:(?:(?!<\/w:r>).)*<\/w:r>/s)?.[0];

        expect(speakerRun).toBeDefined();
        expect(speakerRun).toContain("<w:b/>");
    });
});
