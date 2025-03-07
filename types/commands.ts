import type { ICommand } from '#build/types/commands';
import type { TaskStatus } from './task';
import type { Segment, TranscriptionResponse } from './transcriptionResponse';

export const Cmds = {
    StartTranscriptionCommand: 'StartTranscriptionCommand',
    TranscriptionFinishedCommand: 'TranscriptionFinishedCommand',
    SeekToSecondsCommand: 'SeekToSecondsCommand',
    TogglePlayCommand: 'TogglePlayCommand',
    InsertSegementCommand: 'InsertSegementCommand',
    DeleteSegementCommand: 'DeleteSegementCommand',
    UpdateSegementCommand: 'UpdateSegementCommand',
    TranscriptonNameChangeCommand: 'TranscriptonNameChangeCommand',
    RenameSpeakerCommand: 'RenameSpeakerCommand',
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

export class TogglePlayCommand implements ICommand {
    readonly $type = 'TogglePlayCommand';
}

export class InsertSegementCommand implements ICommand {
    readonly $type = 'InsertSegementCommand';

    constructor(
        public readonly targetSegmentId: string,
        public readonly newSegement: Partial<Segment>,
        public readonly direction: 'before' | 'after') { }
}

export class DeleteSegementCommand implements ICommand {
    readonly $type = 'DeleteSegementCommand';

    constructor(public readonly segmentId: string) { }
}

export class UpdateSegementCommand implements ICommand {
    readonly $type = 'UpdateSegementCommand';

    constructor(
        public readonly segmentId: string,
        public readonly updates: Partial<Segment>) { }
}

export class TranscriptonNameChangeCommand implements ICommand {
    readonly $type = 'TranscriptonNameChangeCommand';

    constructor(public readonly newName: string) { }
}

export class RenameSpeakerCommand implements ICommand {
    readonly $type = 'RenameSpeakerCommand';

    constructor(
        public readonly oldName: string,
        public readonly newName: string) { }
}