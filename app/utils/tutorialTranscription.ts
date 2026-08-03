import { db } from "~/stores/db";
import type { StoredSegment } from "~/types/storedSegments";
import type { StoredTranscription } from "~/types/storedTranscription";

/*
    The mockup transcription the onboarding tour walks through: a short,
    diarized conversation about Transcribo itself, backed by a generated
    silent WAV so playback, timeline and statistics behave like a real
    import. Written to IndexedDB when the tour reaches the editor and
    deleted again when the tour ends — see useTranscriboTour.
*/

/** Fixed id, so a leftover demo is always found and replaced. */
export const TUTORIAL_TRANSCRIPTION_ID = "tutorial-tour-demo";

/** Seconds each demo line occupies, including the gap to the next one. */
const LINE_DURATION_S = 5;
const LINE_GAP_S = 0.4;

const TUTORIAL_SPEAKERS = [
    { id: "SPEAKER_00", name: "Lena Kaufmann" },
    { id: "SPEAKER_01", name: "Marc Wyss" },
    { id: "SPEAKER_02", name: "Sofia Brunner" },
];

type TutorialLocale = "de" | "en";

type TutorialLine = {
    speaker: string;
    de: string;
    en: string;
};

const TUTORIAL_LINES: TutorialLine[] = [
    {
        speaker: "SPEAKER_00",
        de: "Willkommen zu dieser kurzen Beispielaufnahme. Wir sprechen heute über Transcribo, den Transkriptionsdienst des Kantons Basel-Stadt.",
        en: "Welcome to this short sample recording. Today we are talking about Transcribo, the transcription service of the Canton of Basel-Stadt.",
    },
    {
        speaker: "SPEAKER_01",
        de: "Genau. Transcribo nimmt eine Audio- oder Videodatei und schreibt daraus einen vollständigen Text mit Zeitstempeln.",
        en: "Exactly. Transcribo takes an audio or video file and turns it into a full text with timestamps.",
    },
    {
        speaker: "SPEAKER_02",
        de: "Und es erkennt, wer gerade spricht. Diese Sprechererkennung ist der Grund, warum dieses Gespräch in drei Farben dargestellt wird.",
        en: "And it recognises who is speaking. That speaker diarization is why this conversation is shown in three colours.",
    },
    {
        speaker: "SPEAKER_00",
        de: "Wichtig für uns in der Verwaltung: die Verarbeitung läuft vollständig auf Servern der IT Basel-Stadt.",
        en: "Important for us in the administration: processing runs entirely on servers of IT Basel-Stadt.",
    },
    {
        speaker: "SPEAKER_01",
        de: "Deshalb dürfen auch besondere Personendaten und Daten mit erhöhtem Schutzbedarf transkribiert werden.",
        en: "That is why special categories of personal data and data with increased protection requirements may be transcribed as well.",
    },
    {
        speaker: "SPEAKER_02",
        de: "Wie kommt eine Aufnahme in Transcribo? Entweder als Datei-Upload oder direkt als Aufnahme im Browser.",
        en: "How does a recording get into Transcribo? Either as a file upload or recorded directly in the browser.",
    },
    {
        speaker: "SPEAKER_00",
        de: "Für Sitzungen nehme ich Bildschirm und Mikrofon zusammen auf. So sind Videokonferenz und eigene Stimme in einer Spur.",
        en: "For meetings I record screen and microphone together, so the video call and my own voice end up in one track.",
    },
    {
        speaker: "SPEAKER_01",
        de: "Danach lässt sich der Text im Editor korrigieren, Segmente verschieben und Sprecher umbenennen.",
        en: "Afterwards the text can be corrected in the editor, segments can be moved and speakers renamed.",
    },
    {
        speaker: "SPEAKER_02",
        de: "Ich nutze am häufigsten die Zusammenfassung. Ein Klick, und ich habe ein Kurzprotokoll für das Team.",
        en: "I use the summary the most. One click and I have a short protocol for the team.",
    },
    {
        speaker: "SPEAKER_00",
        de: "Zum Schluss der Export: als Text, als Untertitel, als JSON oder als Word-Dokument.",
        en: "Finally the export: as text, as subtitles, as JSON or as a Word document.",
    },
    {
        speaker: "SPEAKER_01",
        de: "Und die Statistik zeigt, wie sich die Sprechzeit auf die Beteiligten verteilt.",
        en: "And the statistics show how the speaking time is distributed among the participants.",
    },
    {
        speaker: "SPEAKER_02",
        de: "Damit haben wir alles gesagt. Diese Beispielaufnahme wird nach der Tour wieder gelöscht.",
        en: "That covers everything. This sample recording is deleted again after the tour.",
    },
];

const TUTORIAL_NAME: Record<TutorialLocale, string> = {
    de: "Beispiel: Transcribo erklärt (Tutorial)",
    en: "Sample: Transcribo explained (tutorial)",
};

const TUTORIAL_SUMMARY: Record<TutorialLocale, string> = {
    de: [
        "## Kurzprotokoll",
        "",
        "- Transcribo transkribiert Audio- und Videodateien zu Text mit Zeitstempeln und erkennt die Sprecher.",
        "- Die Verarbeitung erfolgt auf Servern der IT Basel-Stadt, weshalb auch Daten mit erhöhtem Schutzbedarf zulässig sind.",
        "- Medien kommen per Upload oder als Aufnahme (Mikrofon bzw. Bildschirm und Mikrofon für Sitzungen) in die Anwendung.",
        "- Im Editor werden Text, Zeitstempel und Sprecher korrigiert; Zusammenfassung, Statistik und Export schliessen den Ablauf ab.",
        "",
        "_Diese Zusammenfassung gehört zur Tutorial-Aufnahme und ist nur ein Beispiel._",
    ].join("\n"),
    en: [
        "## Short protocol",
        "",
        "- Transcribo turns audio and video files into text with timestamps and identifies the speakers.",
        "- Processing runs on servers of IT Basel-Stadt, which is why data with increased protection requirements is permitted.",
        "- Media enters the application via upload or recording (microphone, or screen and microphone for meetings).",
        "- The editor is used to correct text, timestamps and speakers; summary, statistics and export complete the workflow.",
        "",
        "_This summary belongs to the tutorial recording and is only an example._",
    ].join("\n"),
};

const TUTORIAL_KEYWORDS: Record<
    TutorialLocale,
    { term: string; description: string; type: "institution" | "object" }[]
> = {
    de: [
        {
            term: "Transcribo",
            description:
                "Transkriptionsdienst des Kantons Basel-Stadt für Audio- und Videodateien.",
            type: "object",
        },
        {
            term: "IT Basel-Stadt",
            description:
                "Betreibt die Server, auf denen die Transkription verarbeitet wird.",
            type: "institution",
        },
        {
            term: "Sprechererkennung",
            description:
                "Ordnet jedem Abschnitt der Aufnahme eine sprechende Person zu.",
            type: "object",
        },
    ],
    en: [
        {
            term: "Transcribo",
            description:
                "Transcription service of the Canton of Basel-Stadt for audio and video files.",
            type: "object",
        },
        {
            term: "IT Basel-Stadt",
            description:
                "Operates the servers on which the transcription is processed.",
            type: "institution",
        },
        {
            term: "Speaker diarization",
            description:
                "Assigns a speaking person to every passage of the recording.",
            type: "object",
        },
    ],
};

/**
 * Narrows an i18n locale to the two languages the demo content ships in.
 *
 * @param locale - The active i18n locale.
 * @returns The matching demo language.
 */
function tutorialLocale(locale: string): TutorialLocale {
    return locale.startsWith("en") ? "en" : "de";
}

/**
 * Writes an ASCII string into a WAV header.
 *
 * @param view - The header's data view.
 * @param offset - Byte offset to write at.
 * @param text - The ASCII text to write.
 */
function writeAscii(view: DataView, offset: number, text: string): void {
    for (let i = 0; i < text.length; i++) {
        view.setUint8(offset + i, text.charCodeAt(i));
    }
}

/**
 * Builds a silent 8 kHz mono WAV, so the demo transcription has real media:
 * the player reports a duration, the timeline scrubs and the statistics can
 * compute a speech ratio.
 *
 * @param seconds - Length of the silence.
 * @returns The WAV blob.
 */
function createSilentWav(seconds: number): Blob {
    const sampleRate = 8000;
    const dataSize = Math.ceil(seconds * sampleRate);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, "WAVE");
    writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true); // byte rate (1 byte per sample)
    view.setUint16(32, 1, true); // block align
    view.setUint16(34, 8, true); // bits per sample
    writeAscii(view, 36, "data");
    view.setUint32(40, dataSize, true);

    // 8-bit PCM is unsigned: silence is 128, not 0.
    new Uint8Array(buffer, 44).fill(128);

    return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Builds the demo segments, laying the lines out back to back on the
 * timeline.
 *
 * @param language - The demo language.
 * @returns The segments in timeline order.
 */
function buildSegments(language: TutorialLocale): StoredSegment[] {
    return TUTORIAL_LINES.map((line, index) => {
        const start = index * (LINE_DURATION_S + LINE_GAP_S);

        return {
            id: `${TUTORIAL_TRANSCRIPTION_ID}-segment-${index}`,
            transcriptionId: TUTORIAL_TRANSCRIPTION_ID,
            start,
            end: start + LINE_DURATION_S,
            text: line[language],
            speaker: line.speaker,
        };
    });
}

/**
 * Creates the tutorial transcription unless it already exists.
 *
 * @param locale - The active i18n locale, picking the demo language.
 * @returns The id of the tutorial transcription.
 */
export async function ensureTutorialTranscription(
    locale: string,
): Promise<string> {
    const existing = await db.transcriptions.get(TUTORIAL_TRANSCRIPTION_ID);
    if (existing) {
        return TUTORIAL_TRANSCRIPTION_ID;
    }

    const language = tutorialLocale(locale);
    const segments = buildSegments(language);
    const totalSeconds = (segments.at(-1)?.end ?? 0) + 1;
    const now = new Date();

    const transcription: StoredTranscription = {
        id: TUTORIAL_TRANSCRIPTION_ID,
        name: TUTORIAL_NAME[language],
        createdAt: now,
        updatedAt: now,
        mediaFile: createSilentWav(totalSeconds),
        mediaFileName: "transcribo-tutorial.wav",
        summary: TUTORIAL_SUMMARY[language],
        keywords: TUTORIAL_KEYWORDS[language],
        speakers: TUTORIAL_SPEAKERS,
    };

    await db.transaction("rw", [db.transcriptions, db.segments], async () => {
        await db.transcriptions.put(transcription);
        await db.segments.bulkPut(segments);
    });

    return TUTORIAL_TRANSCRIPTION_ID;
}

/**
 * Removes the tutorial transcription and its segments.
 */
export async function removeTutorialTranscription(): Promise<void> {
    await db.transaction("rw", [db.transcriptions, db.segments], async () => {
        await db.segments
            .where("transcriptionId")
            .equals(TUTORIAL_TRANSCRIPTION_ID)
            .delete();
        await db.transcriptions.delete(TUTORIAL_TRANSCRIPTION_ID);
    });
}
