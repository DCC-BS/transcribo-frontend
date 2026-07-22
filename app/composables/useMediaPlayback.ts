import { useEventListener } from "@vueuse/core";
import {
    Cmds,
    type PlayFromSecondsCommand,
    type SeekToSecondsCommand,
    type TogglePlayCommand,
} from "~/types/commands";
import type { StoredTranscription } from "~/types/storedTranscription";

/*
    Media playback engine shared by the viewer playbar and the editor dock:
    owns the <audio>/<video> element refs, play/pause/seek/rate state and
    the playback command handlers (TogglePlay, SeekToSeconds,
    PlayFromSeconds) plus the global Space shortcut. The component using it
    binds `videoElement`/`audioElement` to its media tags and mirrors
    `currentTime`.
*/
export function useMediaPlayback(
    transcription: MaybeRefOrGetter<StoredTranscription>,
    currentTime: Ref<number>,
) {
    const mediaFile = ref<Blob | null>(null);
    const mediaSrc = ref<string>("");
    const videoElement = ref<HTMLVideoElement | null>(null);
    const audioElement = ref<HTMLAudioElement | null>(null);
    const isPlaying = ref<boolean>(false);
    const isVideoFile = ref<boolean>(false);
    const playbackRate = ref<number>(1);

    const { onCommand } = useCommandBus();

    onMounted(loadMedia);
    watch(() => toValue(transcription)?.mediaFile, loadMedia);

    onUnmounted(() => {
        if (mediaSrc.value) {
            URL.revokeObjectURL(mediaSrc.value);
        }
    });

    function loadMedia(): void {
        const stored = toValue(transcription);
        if (!stored?.mediaFile) {
            return;
        }

        // Every segment edit re-emits the stored record with a fresh Blob
        // instance for the same media. Reloading would reset the element —
        // and with it the playback position — to 0, so skip when the
        // underlying media is unchanged.
        if (
            mediaFile.value &&
            mediaFile.value.size === stored.mediaFile.size &&
            mediaFile.value.type === stored.mediaFile.type
        ) {
            return;
        }

        if (mediaSrc.value) {
            URL.revokeObjectURL(mediaSrc.value);
        }

        mediaFile.value = stored.mediaFile;
        mediaSrc.value = URL.createObjectURL(mediaFile.value);
        isVideoFile.value = mediaFile.value.type.startsWith("video/");
        isPlaying.value = false;
        nextTick(() => updatePlaybackRate(playbackRate.value));
    }

    function mediaEl(): HTMLMediaElement | null {
        return videoElement.value ?? audioElement.value;
    }

    // While playing, sync currentTime per animation frame instead of the
    // ~4Hz `timeupdate` event so karaoke highlight and playhead move
    // smoothly; `timeupdate` stays as the fallback for paused seeks.
    let rafId = 0;

    function stopRafSync(): void {
        cancelAnimationFrame(rafId);
        rafId = 0;
    }

    function rafSync(): void {
        const el = mediaEl();
        if (!el) {
            rafId = 0;
            return;
        }
        currentTime.value = el.currentTime;
        rafId = el.paused || el.ended ? 0 : requestAnimationFrame(rafSync);
    }

    function startRafSync(): void {
        stopRafSync();
        rafId = requestAnimationFrame(rafSync);
    }

    onUnmounted(stopRafSync);

    // isPlaying follows the element's own events, so it also resets when
    // the media runs out on its own.
    for (const element of [videoElement, audioElement]) {
        // A mode switch remounts the media element at 0 — put it back to
        // the shared playback position once its metadata is ready.
        useEventListener(element, "loadedmetadata", () => {
            const el = element.value;
            if (el && currentTime.value > 0) {
                el.currentTime = currentTime.value;
            }
        });
        useEventListener(element, "play", () => {
            isPlaying.value = true;
            startRafSync();
        });
        useEventListener(element, "pause", () => {
            isPlaying.value = false;
            stopRafSync();
            onTimeUpdate();
        });
        useEventListener(element, "ended", () => {
            isPlaying.value = false;
            stopRafSync();
        });
    }

    function togglePlay(): void {
        const el = mediaEl();
        if (!el) {
            return;
        }
        if (el.paused) {
            el.play();
        } else {
            el.pause();
        }
    }

    function seekTo(time: number): void {
        const el = mediaEl();
        if (el && el.currentTime !== time) {
            el.currentTime = time;
        }
        currentTime.value = time;
    }

    function onTimeUpdate(): void {
        const el = mediaEl();
        if (!el) {
            return;
        }
        // ignore the spurious 0 a freshly mounted element reports before
        // the loadedmetadata restore has seeked it back
        if (el.currentTime === 0 && currentTime.value > 0.5) {
            return;
        }
        currentTime.value = el.currentTime;
    }

    function updatePlaybackRate(rate: number): void {
        const el = mediaEl();
        if (el) {
            el.playbackRate = rate;
        }
    }

    watch(playbackRate, updatePlaybackRate);

    // Space toggles playback everywhere except inside text entry (inputs,
    // textareas, contenteditable) — there it must keep typing spaces. On the
    // play/pause button preventDefault stops the native click from firing a
    // second toggle; other buttons keep their native Space activation.
    function isPlayButton(target: EventTarget | null): boolean {
        return (
            target instanceof HTMLElement &&
            target.closest("#media-play-button") !== null
        );
    }

    function keepsNativeSpace(target: EventTarget | null): boolean {
        if (!(target instanceof HTMLElement)) {
            return false;
        }
        if (target.isContentEditable) {
            return true;
        }
        return (
            target.closest(
                'input, textarea, select, [contenteditable="true"], button, a, [role="button"]',
            ) !== null
        );
    }

    useEventListener(window, "keydown", (event: KeyboardEvent) => {
        if (event.code !== "Space" || event.repeat) {
            return;
        }

        if (!isPlayButton(event.target) && keepsNativeSpace(event.target)) {
            return;
        }

        event.preventDefault();
        togglePlay();
    });

    onCommand<TogglePlayCommand>(Cmds.TogglePlayCommand, async () => {
        togglePlay();
    });

    onCommand<SeekToSecondsCommand>(Cmds.SeekToSecondsCommand, async (cmd) => {
        seekTo(cmd.seconds);
        // A jump button keeps focus after the click, which would make Space
        // re-activate it instead of toggling playback; hand focus back to
        // the body.
        if (document.activeElement instanceof HTMLButtonElement) {
            document.activeElement.blur();
        }
    });

    onCommand<PlayFromSecondsCommand>(
        Cmds.PlayFromSecondsCommand,
        async (cmd) => {
            seekTo(cmd.seconds);
            const el = mediaEl();
            if (el?.paused) {
                el.play();
            }
        },
    );

    return {
        mediaFile,
        mediaSrc,
        videoElement,
        audioElement,
        isPlaying,
        isVideoFile,
        playbackRate,
        togglePlay,
        seekTo,
        onTimeUpdate,
    };
}
