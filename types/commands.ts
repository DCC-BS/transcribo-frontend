import type { ICommand } from "#build/types/commands";
import type { TaskStatus } from "./task";
import type { TranscriptionResponse } from "./transcriptionResponse";

export const Cmds = {
    StartTranscriptionCommand: "StartTranscriptionCommand",
    TranscriptionFinishedCommand: "TranscriptionFinishedCommand",
}

export class StartTranscriptionCommand implements ICommand {
    readonly $type = "StartTranscriptionCommand";

    constructor(
        public taskId: string,
        public audio: File) {
    }
}

export class TranscriptionFinishedCommand implements ICommand {
    readonly $type = "ReportTranscriptionCommandFinished";

    constructor(
        public status: TaskStatus,
        public result?: TranscriptionResponse) {
    }
}
