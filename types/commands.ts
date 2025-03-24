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
    AddSegmentCommand: 'AddSegmentCommand',
};

export type ITransriboReversibleCommand = IReversibleCommand & {
    toLocaleString: (t: (key: string, params?: object) => string) => string
};

export class EmptyCommand implements ICommand {
    readonly $type = 'EmptyCommand';

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return 'Empty Command';
    }

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t('commands.empty');
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

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t('commands.startTranscription', {
            taskId: this.taskId,
            fileName: this.audio.name
        });
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
        return `Transcription Finished: Status ${this.status.status}${this.result ? ', Results available' : ''}`;
    }

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        const hasResults = this.result ? t('commands.transcriptionFinishedResults') : '';
        return t('commands.transcriptionFinished', {
            status: this.status.status,
            hasResults
        });
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

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t('commands.seekToSeconds', { seconds: this.seconds.toFixed(2) });
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

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t('commands.togglePlay');
    }
}

export class AddSegmentCommand implements ITransriboReversibleCommand {
    readonly $type = 'AddSegmentCommand';
    $undoCommand: ICommand = new EmptyCommand();

    constructor(public readonly newSegement: Segment) {
    }

    public setUndoCommand(undoCommand: ICommand) {
        this.$undoCommand = undoCommand;
    }
}

export class InsertSegementCommand implements ITransriboReversibleCommand {
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

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t('commands.insertSegment', { direction: this.direction });
    }
}

export class DeleteSegementCommand implements ITransriboReversibleCommand {
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

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t('commands.deleteSegment');
    }
}

export class UpdateSegementCommand implements ITransriboReversibleCommand {
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

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        const updateDetails = Object.entries(this.updates)
            .map(([field, value]) => `${field}: ${JSON.stringify(value)}`)
            .join(', ');

        if (!updateDetails) {
            return t('commands.updateSegmentNoUpdates');
        }

        return t('commands.updateSegment', { updates: updateDetails });
    }
}

export class TranscriptonNameChangeCommand implements ITransriboReversibleCommand {
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

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t('commands.changeTranscriptionName', { name: this.newName });
    }
}

export class RenameSpeakerCommand implements ITransriboReversibleCommand {
    readonly $type = 'RenameSpeakerCommand';
    readonly $undoCommand: ICommand;

    constructor(
        public readonly oldName: string,
        public readonly newName: string,
        undoCommand?: ICommand) {
        // to avoid circular dependency, we set the undo command in the constructor
        this.$undoCommand = undoCommand || new RenameSpeakerCommand(newName, oldName, this);
    }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return `Rename Speaker: "${this.oldName}" → "${this.newName}"`;
    }

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t('commands.renameSpeaker', {
            oldName: this.oldName,
            newName: this.newName
        });
    }
}