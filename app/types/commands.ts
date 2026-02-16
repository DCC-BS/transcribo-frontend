import type { ICommand, IReversibleCommand } from "#build/types/commands";
import type { TaskStatus } from "./task";
import type {
    SegmentWithId,
    Segment,
    TranscriptionResponse,
} from "./transcriptionResponse";

export const Cmds = {
    UploadFileCommand: "UploadFileCommand",
    StartTranscriptionCommand: "StartTranscriptionCommand",
    TranscriptionFinishedCommand: "TranscriptionFinishedCommand",
    SeekToSecondsCommand: "SeekToSecondsCommand",
    TogglePlayCommand: "TogglePlayCommand",
    InsertSegmentCommand: "InsertSegmentCommand",
    DeleteSegmentCommand: "DeleteSegmentCommand",
    UpdateSegmentCommand: "UpdateSegmentCommand",
    TranscriptionNameChangeCommand: "TranscriptionNameChangeCommand",
    RenameSpeakerCommand: "RenameSpeakerCommand",
    EmptyCommand: "EmptyCommand",
    AddSegmentCommand: "AddSegmentCommand",
    RestoreSegmentCommand: "RestoreSegmentCommand",
};

export type ITransriboReversibleCommand = IReversibleCommand & {
    toLocaleString: (t: (key: string, params?: object) => string) => string;
};

export class UploadFileCommand implements ICommand {
    readonly $type = "UploadFileCommand";

    constructor(
        public readonly file: File,
        public readonly status: TaskStatus,
    ) { }
}

export class EmptyCommand implements ICommand {
    readonly $type = "EmptyCommand";

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return "Empty Command";
    }

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t("commands.empty");
    }
}

export class StartTranscriptionCommand implements ICommand {
    readonly $type = "StartTranscriptionCommand";

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
        return t("commands.startTranscription", {
            taskId: this.taskId,
            fileName: this.audio.name,
        });
    }
}

export class TranscriptionFinishedCommand implements ICommand {
    readonly $type = "TranscriptionFinishedCommand";

    constructor(
        public status: TaskStatus,
        public result?: TranscriptionResponse,
    ) { }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return `Transcription Finished: Status ${this.status.status}${this.result ? ", Results available" : ""}`;
    }

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        const hasResults = this.result
            ? t("commands.transcriptionFinishedResults")
            : "";
        return t("commands.transcriptionFinished", {
            status: this.status.status,
            hasResults,
        });
    }
}

export class SeekToSecondsCommand implements ICommand {
    readonly $type = "SeekToSecondsCommand";

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
        return t("commands.seekToSeconds", {
            seconds: this.seconds.toFixed(2),
        });
    }
}

export class TogglePlayCommand implements ICommand {
    readonly $type = "TogglePlayCommand";

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return "Toggle Play/Pause";
    }

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t("commands.togglePlay");
    }
}

export class AddSegmentCommand implements ITransriboReversibleCommand {
    readonly $type = "AddSegmentCommand";
    $undoCommand: ICommand = new EmptyCommand();

    constructor(public readonly newSegment: Segment) { }

    public setUndoCommand(undoCommand: ICommand) {
        this.$undoCommand = undoCommand;
    }
}

export class InsertSegmentCommand implements ITransriboReversibleCommand {
    readonly $type = "InsertSegmentCommand";
    $undoCommand: ICommand = new EmptyCommand();

    constructor(
        public readonly targetSegmentId: string,
        public readonly newSegment: Partial<Segment>,
        public readonly direction: "before" | "after",
    ) { }

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
        return t("commands.insertSegment", { direction: this.direction });
    }
}

export class RestoreSegmentCommand implements ICommand {
    readonly $type = "RestoreSegmentCommand";

    constructor(public readonly segmentData: SegmentWithId) { }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return `Restore Segment: ${this.segmentData.text.substring(0, 30)}...`;
    }

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t("commands.restoreSegment");
    }
}

export class DeleteSegmentCommand implements ITransriboReversibleCommand {
    readonly $type = "DeleteSegmentCommand";
    $undoCommand: ICommand = new EmptyCommand();

    constructor(public readonly segmentId: string) { }

    public setUndoCommand(undoCommand: ICommand) {
        this.$undoCommand = undoCommand;
    }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        return "Delete Segment";
    }

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        return t("commands.deleteSegment");
    }
}

export class UpdateSegmentCommand implements ITransriboReversibleCommand {
    readonly $type = "UpdateSegmentCommand";
    $undoCommand: ICommand = new EmptyCommand();

    constructor(
        public readonly segmentId: string,
        public readonly updates: Partial<Segment>,
    ) { }

    public setUndoCommand(undoCommand: ICommand) {
        this.$undoCommand = undoCommand;
    }

    /**
     * Returns a string representation of the command
     */
    toString(): string {
        const updateDetails = Object.entries(this.updates)
            .map(([field, value]) => `${field}: ${JSON.stringify(value)}`)
            .join(", ");
        return `Update Segment: Updates: ${updateDetails || "none"}`;
    }

    /**
     * Returns a localized string representation of the command
     * @param t - Translation function from useI18n
     */
    toLocaleString(t: (key: string, params?: object) => string): string {
        const updateDetails = Object.entries(this.updates)
            .map(([field, value]) => `${field}: ${JSON.stringify(value)}`)
            .join(", ");

        if (!updateDetails) {
            return t("commands.updateSegmentNoUpdates");
        }

        return t("commands.updateSegment", { updates: updateDetails });
    }
}

export class TranscriptionNameChangeCommand
    implements ITransriboReversibleCommand {
    readonly $type = "TranscriptionNameChangeCommand";
    $undoCommand: ICommand = new EmptyCommand();

    constructor(public readonly newName: string) { }

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
        return t("commands.changeTranscriptionName", { name: this.newName });
    }
}

export class RenameSpeakerCommand implements ITransriboReversibleCommand {
    readonly $type = "RenameSpeakerCommand";
    readonly $undoCommand: ICommand;

    constructor(
        public readonly oldName: string,
        public readonly newName: string,
        undoCommand?: ICommand,
    ) {
        // to avoid circular dependency, we set the undo command in the constructor
        this.$undoCommand =
            undoCommand || new RenameSpeakerCommand(newName, oldName, this);
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
        return t("commands.renameSpeaker", {
            oldName: this.oldName,
            newName: this.newName,
        });
    }
}
