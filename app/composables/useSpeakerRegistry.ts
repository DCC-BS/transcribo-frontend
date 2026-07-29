import { createInjectionState } from "@vueuse/core";
import type { StoredSegment } from "~/types/storedSegments";
import type { Speaker, StoredTranscription } from "~/types/storedTranscription";

/*
    Single source of truth for speakers on a transcription page.

    A speaker is an entity: a stable id (the diarization key on segments,
    SPEAKER_00 …) plus an editable display name. The roster is persisted on
    the transcription, append-only, and the array index is the speaker's
    fixed color slot — so colors never shift when segments move, speakers
    are renamed, or a speaker temporarily has no segments.

    Provided once by the page and injected by every view (lanes, document
    editor, viewer, playback bar, statistics, menus), so all of them always
    agree.
*/
const [provideSpeakerRegistry, injectSpeakerRegistry] = createInjectionState(
    (
        transcription: MaybeRefOrGetter<StoredTranscription | undefined>,
        segments: MaybeRefOrGetter<StoredSegment[]>,
    ) => {
        // ids added via "add speaker" this session that have no segments yet
        const sessionIds = ref<string[]>([]);

        /** Stored roster plus any segment keys it does not know yet. */
        const roster = computed<Speaker[]>(() => {
            const entries = [...(toValue(transcription)?.speakers ?? [])];
            const known = new Set(entries.map((speaker) => speaker.id));
            for (const key of getUniqueSpeakers(toValue(segments))) {
                if (!known.has(key)) {
                    known.add(key);
                    entries.push({ id: key });
                }
            }
            return entries;
        });

        /*
            Persist the roster whenever segments introduce a key the stored
            one does not have (e.g. a freshly inserted segment). Only this
            single provided instance writes, so updates never cascade.
        */
        watch(
            roster,
            async (entries) => {
                const stored = toValue(transcription);
                if (
                    stored &&
                    entries.length !== (stored.speakers?.length ?? 0)
                ) {
                    await getTranscriptionService().updateTranscription(
                        stored.id,
                        { speakers: entries },
                    );
                }
            },
            { immediate: true },
        );

        /** Speaker ids shown in lanes and menus: those with segments, plus
         *  ids added this session that are still empty. */
        const speakerIds = computed(() => {
            const present = getUniqueSpeakers(toValue(segments));
            return roster.value
                .map((speaker) => speaker.id)
                .filter(
                    (id) => present.has(id) || sessionIds.value.includes(id),
                );
        });

        /**
         * Display name of a speaker.
         *
         * @param id - Speaker id, or `undefined` for unassigned segments.
         * @returns The stored name, falling back to the id itself.
         */
        function displayName(id: string | undefined): string {
            if (!id) {
                return "unknown";
            }
            return (
                roster.value.find((speaker) => speaker.id === id)?.name || id
            );
        }

        // color slot = roster index, resolved by the shared palette
        const rosterIds = computed(() =>
            roster.value.map((speaker) => speaker.id),
        );
        const { getSpeakerColor } = useSpeakerColor(rosterIds);

        /** CSS color per visible speaker id — ready for style bindings. */
        const speakerColors = computed<Record<string, string>>(() =>
            Object.fromEntries(
                speakerIds.value.map((id) => [
                    id,
                    getSpeakerColor(id).toString(),
                ]),
            ),
        );

        /**
         * Creates a speaker with a fresh key and the given display name.
         *
         * @param name - Display name; blank names are rejected.
         * @returns `true` when the speaker was added.
         */
        async function addSpeaker(name: string): Promise<boolean> {
            const trimmed = name.trim();
            const stored = toValue(transcription);
            if (!trimmed || !stored) {
                return false;
            }
            const id = nextSpeakerName(rosterIds.value);
            sessionIds.value.push(id);
            await getTranscriptionService().updateTranscription(stored.id, {
                speakers: [...roster.value, { id, name: trimmed }],
            });
            return true;
        }

        /**
         * Drops a session-only speaker that never received segments.
         *
         * @param id - Speaker id to forget.
         */
        function removeEmptySpeaker(id: string): void {
            sessionIds.value = sessionIds.value.filter(
                (sessionId) => sessionId !== id,
            );
        }

        return {
            speakerIds,
            displayName,
            speakerColors,
            getSpeakerColor,
            addSpeaker,
            removeEmptySpeaker,
        };
    },
);

export { provideSpeakerRegistry };

/**
 * Injects the speaker registry provided by the transcription page.
 *
 * @returns The shared speaker registry.
 * @throws When no ancestor called `provideSpeakerRegistry()`.
 */
export function useSpeakerRegistry() {
    const registry = injectSpeakerRegistry();
    if (!registry) {
        throw new Error(
            "useSpeakerRegistry() requires provideSpeakerRegistry() in an ancestor component",
        );
    }
    return registry;
}
