import type { ICommand } from '#build/types/commands';
import type { TaskStatus } from './task';
import type { TranscriptionResponse } from './transcriptionResponse';

export const Cmds = {
    StartTranscriptionCommand: 'StartTranscriptionCommand',
    TranscriptionFinishedCommand: 'TranscriptionFinishedCommand',
    SeekToSecondsCommand: 'SeekToSecondsCommand',
    ZoomToCommand: 'ZoomToCommand',
};

export class StartTranscriptionCommand implements ICommand {
    readonly $type = 'StartTranscriptionCommand';

    constructor(
        public taskId: string,
        public audio: File,
    ) { }
}

export class TranscriptionFinishedCommand implements ICommand {
    readonly $type = 'TranscriptionFinishedCommand';

    constructor(
        public status: TaskStatus,
        public result?: TranscriptionResponse,
    ) { }
}

export class SeekToSecondsCommand implements ICommand {
    readonly $type = 'SeekToSecondsCommand';

    constructor(public seconds: number) { }
}

export class ZoomToCommand implements ICommand {
    readonly $type = 'ZoomToCommand';

    constructor(public posX: number, public zoomX: number) {
        this.zoomX = Math.max(0.1, Math.min(10, zoomX));
    }
}