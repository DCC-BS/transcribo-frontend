import type { ICommand, IReversibleCommand } from '#build/types/commands';
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
    EmptyCommand: 'EmptyCommand',
};

export class EmptyCommand implements ICommand {
    readonly $type = 'EmptyCommand';

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return 'Empty Command';
    }
}

export class StartTranscriptionCommand implements ICommand {
    readonly $type = 'StartTranscriptionCommand';

    constructor(
        public taskId: string,
        public audio: File,
    ) { }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return `Start Transcription: Task ID ${this.taskId}, File: ${this.audio.name}`;
    }
}

export class TranscriptionFinishedCommand implements ICommand {
    readonly $type = 'TranscriptionFinishedCommand';

    constructor(
        public status: TaskStatus,
        public result?: TranscriptionResponse,
    ) { }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return `Transcription Finished: Status ${this.status}${this.result ? ', Results available' : ''}`;
    }
}

export class SeekToSecondsCommand implements ICommand {
    readonly $type = 'SeekToSecondsCommand';

    constructor(public seconds: number) { }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return `Seek To: ${this.seconds.toFixed(2)} seconds`;
    }
}

export class TogglePlayCommand implements ICommand {
    readonly $type = 'TogglePlayCommand';

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return 'Toggle Play/Pause';
    }
}

export class InsertSegementCommand implements IReversibleCommand {
    readonly $type = 'InsertSegementCommand';
    $undoCommand: ICommand = new EmptyCommand();

    constructor(
        public readonly targetSegmentId: string,
        public readonly newSegement: Partial<Segment>,
        public readonly direction: 'before' | 'after') {
    }

    public setUndoCommand(undoCommand: ICommand) {
        this.$undoCommand = undoCommand;
    }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return `Insert Segment ${this.direction}`;
    }
}

export class DeleteSegementCommand implements IReversibleCommand {
    readonly $type = 'DeleteSegementCommand';
    $undoCommand: ICommand;

    constructor(public readonly segmentId: string) {
        this.$undoCommand = new InsertSegementCommand(segmentId, {}, 'after');
    }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return `Delete Segment`;
    }
}

export class UpdateSegementCommand implements IReversibleCommand {
    readonly $type = 'UpdateSegementCommand';
    $undoCommand: ICommand = new EmptyCommand();

    constructor(
        public readonly segmentId: string,
        public readonly updates: Partial<Segment>) {
    }

    public setUndoCommand(undoCommand: ICommand) {
        this.$undoCommand = undoCommand;
    }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        const updateDetails = Object.entries(this.updates)
            .map(([field, value]) => `${field}: ${JSON.stringify(value)}`)
            .join(', ');
        return `Update Segment: Updates: ${updateDetails || 'none'}`;
    }
}

export class TranscriptonNameChangeCommand implements IReversibleCommand {
    readonly $type = 'TranscriptonNameChangeCommand';
    $undoCommand: ICommand = new EmptyCommand();

    constructor(public readonly newName: string) {
    }

    public setUndoCommand(undoCommand: ICommand) {
        this.$undoCommand = undoCommand;
    }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return `Change Transcription Name To: ${this.newName}`;
    }
}

export class RenameSpeakerCommand implements IReversibleCommand {
    readonly $type = 'RenameSpeakerCommand';
    readonly $undoCommand: ICommand;

    constructor(
        public readonly oldName: string,
        public readonly newName: string) {
        this.$undoCommand = new RenameSpeakerCommand(newName, oldName);
    }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return `Rename Speaker: "${this.oldName}" → "${this.newName}"`;
    }
}