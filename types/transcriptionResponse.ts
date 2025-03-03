/**
 * Interface representing a word in the transcription
 * Corresponds to the Python Word model
 */
export interface Word {
    start: number;
    end: number;
    word: string;
    probability: number;
    speaker: string | null;
}

/**
 * Interface representing a segment in the transcription
 * Corresponds to the Python Segment model
 */
export interface Segment {
    start: number;
    end: number;
    text: string;
    speaker: string | null;
}

/**
 * Interface representing a transcription response
 * Corresponds to the Python TranscriptionResponse model
 */
export interface TranscriptionResponse {
    segments: Segment[];
}

/**
 * Interface representing a verbose segment in the transcription
 * Corresponds to the Python VerboseSegment model
 */
export interface VerboseSegment {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
    words: Word[] | null;
    speaker: string | null;
}

/**
 * Interface representing a verbose transcription response
 * Corresponds to the Python VerboseTranscriptionResponse model
 */
export interface VerboseTranscriptionResponse {
    task: string; // Default is "transcribe"
    language: string;
    duration: number;
    text: string;
    words: Word[];
    segments: VerboseSegment[];
}
