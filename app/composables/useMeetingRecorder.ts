import { useDisplayMedia, useIntervalFn, useUserMedia } from "@vueuse/core";

/*
    Records a meeting as a single audio track: the microphone (your own voice)
    mixed with the audio of a shared screen (everyone else in the call).

    Browsers only hand out screen audio together with a video track, so video
    is requested but never recorded — both streams are routed through a Web
    Audio graph into one destination, and only that mix reaches the recorder.
*/

// Opus in WebM is what every browser that can capture screen audio produces;
// the ordering is just a fallback chain, not a preference the user can see.
const MIME_TYPES = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
];

/**
 * Picks the first recording container the browser supports.
 *
 * @returns The mime type to record with, or `undefined` to let the browser
 * decide.
 */
function pickMimeType(): string | undefined {
    return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/** Why the feature cannot be offered, or `null` when it can. */
export type MeetingRecorderUnsupported = "browser" | "platform";

/*
    Capturing the sound of the whole screen cannot be feature-detected —
    getDisplayMedia exists everywhere and quietly returns a video-only stream
    where audio is not available. So the support matrix is spelled out:

    - Gecko and WebKit (incl. everything on iOS) never deliver screen audio.
    - Chromium delivers the sound of other applications only on Windows and
      ChromeOS. On Linux and macOS it is limited to the audio of a browser
      tab, which is no use for a meeting held in a desktop app like Teams.
*/
/**
 * Decides whether meeting recording can be offered at all.
 *
 * @returns Why the feature is unavailable, or `null` when it can be used.
 */
function detectUnsupported(): MeetingRecorderUnsupported | null {
    if (typeof navigator === "undefined") {
        return "browser";
    }
    const agent = navigator.userAgent;
    const isChromium = /Chrom(e|ium)|Edg\//.test(agent);
    if (!isChromium) {
        return "browser";
    }
    return /Windows NT|CrOS/.test(agent) ? null : "platform";
}

export type MeetingRecorderError =
    | "permission-denied"
    | "no-screen-audio"
    | "failed";

/**
 * Records a meeting as one audio track: microphone mixed with shared-screen
 * audio. Devices are released again when the surrounding scope is disposed.
 *
 * @returns Recording state (support, progress, elapsed time, live stream,
 * error) plus `start` and `stop`.
 */
export function useMeetingRecorder() {
    const mic = useUserMedia({ constraints: { audio: true, video: false } });
    // video: true is required — browsers refuse to share audio on its own
    const screen = useDisplayMedia({ audio: true, video: true });

    const isRecording = ref(false);
    const isStarting = ref(false);
    const error = ref<MeetingRecorderError | null>(null);
    const elapsedSeconds = ref(0);
    /** The mixed audio being recorded — drives the level visualizer. */
    const stream = shallowRef<MediaStream | undefined>();

    const unsupported = computed<MeetingRecorderUnsupported | null>(() => {
        if (
            !mic.isSupported.value ||
            !screen.isSupported.value ||
            typeof MediaRecorder === "undefined"
        ) {
            return "browser";
        }
        return detectUnsupported();
    });
    const isSupported = computed(() => unsupported.value === null);

    let recorder: MediaRecorder | undefined;
    let audioContext: AudioContext | undefined;
    let chunks: Blob[] = [];
    let resolveRecording: ((audio: Blob | undefined) => void) | undefined;

    const timer = useIntervalFn(
        () => {
            elapsedSeconds.value += 1;
        },
        1000,
        { immediate: false },
    );

    /**
     * Mixes the given streams down to one audio-only stream. The AudioContext
     * is kept so it can be closed again when the recording ends.
     *
     * @param streams - Source streams; tracks without audio are ignored.
     * @returns The mixed audio-only stream.
     */
    function mixToSingleStream(streams: MediaStream[]): MediaStream {
        audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        for (const source of streams) {
            if (source.getAudioTracks().length > 0) {
                audioContext
                    .createMediaStreamSource(source)
                    .connect(destination);
            }
        }
        return destination.stream;
    }

    /**
     * Stops microphone and screen capture and tears down the audio graph.
     */
    function releaseDevices(): void {
        mic.stop();
        screen.stop();
        void audioContext?.close();
        audioContext = undefined;
        stream.value = undefined;
    }

    /**
     * Starts microphone and screen capture and records the mix.
     *
     * @returns The recorded audio once {@link stop} is called, or `undefined`
     * when the recording could not be started — `error` says why.
     */
    async function start(): Promise<Blob | undefined> {
        if (isRecording.value || isStarting.value) {
            return undefined;
        }
        error.value = null;
        isStarting.value = true;

        try {
            // the screen picker first: it is the step a user is most likely
            // to cancel, and cancelling should not leave the mic running
            const screenStream = await screen.start();
            if (!screenStream) {
                error.value = "permission-denied";
                return undefined;
            }
            if (screenStream.getAudioTracks().length === 0) {
                error.value = "no-screen-audio";
                releaseDevices();
                return undefined;
            }

            const micStream = await mic.start();
            if (!micStream) {
                error.value = "permission-denied";
                releaseDevices();
                return undefined;
            }

            // ending the share from the browser's own bar must stop us too
            for (const track of screenStream.getVideoTracks()) {
                track.addEventListener("ended", () => void stop());
            }

            stream.value = mixToSingleStream([micStream, screenStream]);
            recorder = new MediaRecorder(stream.value, {
                mimeType: pickMimeType(),
            });
            chunks = [];
            recorder.addEventListener("dataavailable", (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            });

            const recording = new Promise<Blob | undefined>((resolve) => {
                resolveRecording = resolve;
            });
            // read off the recorder now: `stop` fires asynchronously, by
            // which time the reference has already been cleared
            const recordedType = recorder.mimeType;
            recorder.addEventListener("stop", () => {
                const audio = chunks.length
                    ? new Blob(chunks, { type: recordedType })
                    : undefined;
                chunks = [];
                resolveRecording?.(audio);
                resolveRecording = undefined;
            });
            // without this the caller would await a recording that can never
            // arrive, leaving the view stuck mid-recording
            recorder.addEventListener("error", () => {
                error.value = "failed";
                chunks = [];
                resolveRecording?.(undefined);
                resolveRecording = undefined;
                stop();
            });

            recorder.start();
            isRecording.value = true;
            isStarting.value = false;
            elapsedSeconds.value = 0;
            timer.resume();
            // resolves only once stop() is called, so the caller awaits the
            // whole recording
            return await recording;
        } catch (cause) {
            error.value =
                cause instanceof DOMException &&
                cause.name === "NotAllowedError"
                    ? "permission-denied"
                    : "failed";
            releaseDevices();
            return undefined;
        } finally {
            isStarting.value = false;
        }
    }

    /**
     * Ends the recording and releases the devices.
     *
     * Devices are released unconditionally, not just while recording: the
     * screen share is granted before the recorder exists, and unlike
     * useUserMedia, VueUse's useDisplayMedia registers no scope-dispose
     * cleanup of its own. Tearing down between the picker and the first chunk
     * would otherwise leave the capture — and the browser's "sharing your
     * screen" bar — running.
     */
    function stop(): void {
        if (isRecording.value) {
            isRecording.value = false;
            timer.pause();
            recorder?.stop();
            recorder = undefined;
        }
        releaseDevices();
    }

    onScopeDispose(stop);

    return {
        isSupported,
        unsupported,
        isRecording,
        isStarting,
        elapsedSeconds,
        stream,
        error,
        start,
        stop,
    };
}
