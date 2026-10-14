import { useDisplayMedia, useUserMedia } from "@vueuse/core";

/*
    Records a meeting as a single audio track: the microphone (your own voice)
    mixed with the audio of a shared screen (everyone else in the call).

    Browsers only hand out screen audio together with a video track, so video
    is requested but never recorded — both streams are routed through a Web
    Audio graph into one destination, and only that mix reaches the recorder.
    Recording itself is left to useAudioRecording, so a meeting is stored in
    IndexedDB chunk by chunk and survives a crash like any other recording.
*/

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

/** Thrown inside the capture step to abort the recording; `error` says why. */
class CaptureAborted extends Error {}

/**
 * Records a meeting as one audio track: microphone mixed with shared-screen
 * audio. Devices are released again when the surrounding scope is disposed;
 * an interrupted recording stays in IndexedDB and shows up as abandoned.
 *
 * @param logger - Receives debug output of the underlying recorder.
 * @returns Recording state (support, progress, elapsed time, live stream,
 * error) plus `start` and `stop`.
 */
export function useMeetingRecorder(logger?: (msg: string) => void) {
    const mic = useUserMedia({ constraints: { audio: true, video: false } });
    // video: true is required — browsers refuse to share audio on its own
    const screen = useDisplayMedia({ audio: true, video: true });

    const isStarting = ref(false);
    const error = ref<MeetingRecorderError | null>(null);
    /** The mixed audio being recorded — drives the level visualizer. */
    const stream = shallowRef<MediaStream | undefined>();

    let audioContext: AudioContext | undefined;
    let resolveRecording: ((audio: Blob | undefined) => void) | undefined;

    const {
        isRecording,
        isProcessing,
        recordingTime: elapsedSeconds,
        startRecording,
        stopRecording,
    } = useAudioRecording({
        getStream: captureMix,
        onRecordingStarted: (mix) => {
            stream.value = mix;
        },
        onRecordingStopped: (audio) => finish(audio),
        storeToDbInterval: 10,
        logger,
    });

    const unsupported = computed<MeetingRecorderUnsupported | null>(() => {
        if (!mic.isSupported.value || !screen.isSupported.value) {
            return "browser";
        }
        return detectUnsupported();
    });
    const isSupported = computed(() => unsupported.value === null);

    /**
     * Asks for the screen share and the microphone and mixes both into one
     * audio-only stream for the recorder.
     *
     * @returns The mixed stream.
     * @throws CaptureAborted when a source is missing; `error` says which.
     */
    async function captureMix(): Promise<MediaStream> {
        try {
            return await mixSources();
        } catch (cause) {
            if (
                cause instanceof DOMException &&
                cause.name === "NotAllowedError"
            ) {
                error.value = "permission-denied";
            }
            throw cause;
        }
    }

    /**
     * Opens both sources and routes them into one destination.
     *
     * @returns The mixed stream.
     */
    async function mixSources(): Promise<MediaStream> {
        // the screen picker first: it is the step a user is most likely
        // to cancel, and cancelling should not leave the mic running
        const screenStream = await screen.start();
        if (!screenStream) {
            error.value = "permission-denied";
            throw new CaptureAborted();
        }
        if (screenStream.getAudioTracks().length === 0) {
            error.value = "no-screen-audio";
            throw new CaptureAborted();
        }

        const micStream = await mic.start();
        if (!micStream) {
            error.value = "permission-denied";
            throw new CaptureAborted();
        }

        // ending the share from the browser's own bar must stop us too
        for (const track of screenStream.getVideoTracks()) {
            track.addEventListener("ended", () => void stop());
        }

        audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        for (const source of [micStream, screenStream]) {
            audioContext.createMediaStreamSource(source).connect(destination);
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
     * Hands the finished recording to whoever awaits {@link start}.
     *
     * @param audio - The recorded audio, or `undefined` if there is none.
     */
    function finish(audio: Blob | undefined): void {
        releaseDevices();
        resolveRecording?.(audio);
        resolveRecording = undefined;
    }

    /**
     * Starts microphone and screen capture and records the mix.
     *
     * @returns The recorded audio once {@link stop} is called, or `undefined`
     * when the recording could not be started — `error` says why.
     */
    async function start(): Promise<Blob | undefined> {
        if (isRecording.value || isStarting.value || isProcessing.value) {
            return undefined;
        }
        error.value = null;
        isStarting.value = true;

        // resolves only once stop() is called, so the caller awaits the
        // whole recording
        const recording = new Promise<Blob | undefined>((resolve) => {
            resolveRecording = resolve;
        });
        try {
            await startRecording();
        } finally {
            isStarting.value = false;
        }

        // useAudioRecording reports start failures through its own,
        // microphone-worded error; ours is more precise when we have one
        if (!isRecording.value) {
            error.value ??= "failed";
            finish(undefined);
        }
        return recording;
    }

    /**
     * Ends the recording; the audio arrives through {@link start} once the
     * stored chunks are joined.
     */
    async function stop(): Promise<void> {
        if (!isRecording.value) {
            return;
        }
        try {
            await stopRecording();
        } catch {
            error.value = "failed";
            finish(undefined);
        }
    }

    /*
        Unmounting only releases the devices: useAudioRecording aborts on its
        own and keeps the stored chunks, so the meeting can be recovered from
        the abandoned recordings. useDisplayMedia, unlike useUserMedia,
        registers no cleanup of its own, so without this the browser's
        "sharing your screen" bar would keep running.
    */
    onScopeDispose(() => finish(undefined));

    return {
        isSupported,
        unsupported,
        isRecording,
        isStarting,
        isProcessing,
        elapsedSeconds,
        stream,
        error,
        start,
        stop,
    };
}
