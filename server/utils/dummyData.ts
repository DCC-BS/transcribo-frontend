export interface DummyTaskStatus {
    task_id: string;
    status: "in_progress" | "completed" | "failed" | "cancelled";
    created_at: string | null;
    executed_at: string | null;
    progress: number | null;
}

export interface DummySegment {
    start: number;
    end: number;
    text: string;
    speaker: string | null;
}

export interface DummyTranscriptionResponse {
    segments: DummySegment[];
}

export interface DummySummary {
    summary: string;
}

const SAMPLE_TRANSCRIPT_SEGMENTS: DummySegment[] = [
    {
        start: 0.0,
        end: 4.2,
        text: "Good morning everyone, thank you for joining today's meeting about the new product launch.",
        speaker: "Speaker_1",
    },
    {
        start: 4.5,
        end: 8.9,
        text: "I'd like to start by going over the timeline and key milestones we need to hit.",
        speaker: "Speaker_1",
    },
    {
        start: 9.3,
        end: 14.1,
        text: "That sounds great. I've prepared the marketing materials and they're ready for review.",
        speaker: "Speaker_2",
    },
    {
        start: 14.5,
        end: 19.8,
        text: "Excellent. What about the technical side? Are we on track with development?",
        speaker: "Speaker_1",
    },
    {
        start: 20.2,
        end: 26.4,
        text: "Yes, the engineering team has completed the core features. We're now focusing on testing and bug fixes.",
        speaker: "Speaker_3",
    },
    {
        start: 26.8,
        end: 32.1,
        text: "We've identified a few performance issues, but they should be resolved by end of week.",
        speaker: "Speaker_3",
    },
    {
        start: 32.5,
        end: 37.6,
        text: "What's our budget situation? Do we have enough resources for the launch campaign?",
        speaker: "Speaker_2",
    },
    {
        start: 38.0,
        end: 44.3,
        text: "We're currently within budget. I've allocated funds for both digital and traditional marketing channels.",
        speaker: "Speaker_4",
    },
    {
        start: 44.7,
        end: 50.9,
        text: "Great. Let's schedule a follow-up meeting next Tuesday to finalize the launch strategy.",
        speaker: "Speaker_1",
    },
    {
        start: 51.3,
        end: 56.5,
        text: "I'll send out calendar invites and the meeting agenda by end of day.",
        speaker: "Speaker_2",
    },
    {
        start: 56.9,
        end: 61.2,
        text: "Perfect. Thank you all for your hard work. Let's make this launch a success.",
        speaker: "Speaker_1",
    },
    {
        start: 61.6,
        end: 65.0,
        text: "Any questions before we wrap up?",
        speaker: "Speaker_1",
    },
];

const SAMPLE_SUMMARY =
    "The meeting covered the upcoming product launch, with discussions on timelines, marketing materials, technical development progress, and budget allocation. The engineering team has completed core features and is now in testing phase. Marketing materials are ready for review. Budget is on track with allocation for both digital and traditional channels. A follow-up meeting was scheduled for next Tuesday to finalize the launch strategy.";

export function createDummyTaskStatus(taskId: string): DummyTaskStatus {
    return {
        task_id: taskId,
        status: "completed",
        created_at: new Date(Date.now() - 300000).toISOString(),
        executed_at: new Date(Date.now() - 60000).toISOString(),
        progress: 1.0,
    };
}

export function createDummyTranscriptionResponse(): DummyTranscriptionResponse {
    return {
        segments: SAMPLE_TRANSCRIPT_SEGMENTS,
    };
}

export function createDummySummary(): DummySummary {
    return {
        summary: SAMPLE_SUMMARY,
    };
}

export function generateDummyTaskId(): string {
    return `dummy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function dummyTaskStatusFetcher(options: {
    url: string;
}): DummyTaskStatus {
    const taskId = options.url.split("/").pop() || generateDummyTaskId();
    return createDummyTaskStatus(taskId);
}

export function dummyTranscriptionResultFetcher(): DummyTranscriptionResponse {
    return createDummyTranscriptionResponse();
}

export function dummySummaryFetcher(): DummySummary {
    return createDummySummary();
}
