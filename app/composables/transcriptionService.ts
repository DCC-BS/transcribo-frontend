import { db } from "~/stores/db";
import {
    type AddSegmentCommand,
    Cmds,
    type DeleteSegmentCommand,
    DeleteSegmentsCommand,
    type InsertSegmentCommand,
    type MergeSpeakerCommand,
    type RenameSpeakerCommand,
    RestoreSegmentCommand,
    RestoreSegmentsCommand,
    TranscriptionNameChangeCommand,
    type UnmergeSpeakerCommand,
    UnmergeSpeakerCommand as UnmergeSpeakerCommandClass,
    UpdateSegmentCommand,
    UpdateSegmentsCommand,
} from "~/types/commands";
import { nextSpeakerName } from "~/utils/speakerUtils";

// Default length of a freshly created segment, in seconds.
const SEGMENT_LENGTH = 2;

/** Next unused SPEAKER_xx id, counting segment keys and the stored roster
 *  (a rostered speaker may currently have no segments). */
async function nextFreeSpeakerId(
    transcriptionId: string,
    segmentSpeakers: (string | null | undefined)[],
): Promise<string> {
    const transcription = await db.transcriptions.get(transcriptionId);
    return nextSpeakerName([
        ...segmentSpeakers,
        ...(transcription?.speakers ?? []).map((speaker) => speaker.id),
    ]);
}

/**
 * A {@link SEGMENT_LENGTH}-second window starting at `anchor` (never before 0).
 * New segments get their own new speaker, so they never overlap themselves and
 * need no gap search.
 *
 * @param anchor - Desired start time in seconds.
 * @returns Start and end time of the new segment.
 */
function segmentWindow(anchor: number): { start: number; end: number } {
    const start = Math.max(anchor, 0);
    return { start, end: start + SEGMENT_LENGTH };
}

/**
 * Registers the command-bus handlers that apply transcription edits (segment
 * create/update/delete, speaker rename/merge, title change) to the store,
 * including their undo counterparts.
 */
export const useTranscriptionCommandHandler = () => {
    const logger = useLogger();
    const { onCommand } = useCommandBus();
    const { updateTranscription } = getTranscriptionService();
    const {
        getSegment,
        deleteSegment,
        deleteSegments,
        updateSegment,
        updateSegments,
        putSegment,
        putSegments,
        addSegment,
    } = getSegmentService();

    onCommand<DeleteSegmentCommand>(
        Cmds.DeleteSegmentCommand,
        async (command) => {
            const segmentToDelete = await getSegment(command.segmentId);

            if (!segmentToDelete) {
                logger.warn("Segment to delete not found");
                return;
            }

            // Create an undo command with the complete segment data including its ID
            // We'll use RestoreSegmentCommand to restore the deleted segment with its original ID
            const undoCommand = new RestoreSegmentCommand(segmentToDelete);

            // Set the undo command on the delete command
            command.setUndoCommand(undoCommand);

            // Now delete the segment
            await deleteSegment(command.segmentId);
        },
    );

    // A merged lane block deletes/restores as ONE history step, so undo and
    // redo always affect the whole block, never its member segments one by
    // one.
    onCommand<DeleteSegmentsCommand>(
        Cmds.DeleteSegmentsCommand,
        async (command) => {
            const segments = await deleteSegments(command.segmentIds);
            if (segments.length > 0) {
                command.setUndoCommand(new RestoreSegmentsCommand(segments));
            }
        },
    );

    onCommand<RestoreSegmentsCommand>(
        Cmds.RestoreSegmentsCommand,
        async (command) => {
            command.setUndoCommand(
                new DeleteSegmentsCommand(
                    command.segments.map((segment) => segment.id),
                ),
            );
            await putSegments(command.segments);
        },
    );

    onCommand<InsertSegmentCommand>(
        Cmds.InsertSegmentCommand,
        async (command) => {
            const targetSegment = await getSegment(command.targetSegmentId);

            if (!targetSegment) {
                logger.warn("Target segment is undefined");
                return;
            }

            const segments = await db.segments
                .where("transcriptionId")
                .equals(command.transcriptionId)
                .toArray();

            // A fresh segment is its own new speaker, so it can never overlap
            // itself — place it cleanly right next to the target, clamped to
            // the media bounds.
            const anchor =
                command.direction === "before"
                    ? targetSegment.start - SEGMENT_LENGTH
                    : targetSegment.end;
            const { start, end } = segmentWindow(anchor);

            // On redo the speaker of the first run is reused, so the segment
            // comes back exactly as it was.
            const speaker =
                command.resolvedSpeaker ??
                command.newSegment.speaker ??
                (await nextFreeSpeakerId(
                    command.transcriptionId,
                    segments.map((segment) => segment.speaker),
                ));
            command.setResolvedSpeaker(speaker);

            await addSegment(
                {
                    start,
                    end,
                    text: "",
                    transcriptionId: command.transcriptionId,
                    ...command.newSegment,
                    speaker,
                },
                command.newSegmentId,
            );
        },
    );

    onCommand<AddSegmentCommand>(Cmds.AddSegmentCommand, async (command) => {
        // Assign a unique new speaker unless the caller already picked one or
        // an earlier run of this very command did (redo).
        const speaker =
            command.resolvedSpeaker ||
            command.newSegment.speaker ||
            (await nextFreeSpeakerId(
                command.newSegment.transcriptionId,
                (
                    await db.segments
                        .where("transcriptionId")
                        .equals(command.newSegment.transcriptionId)
                        .toArray()
                ).map((segment) => segment.speaker),
            ));
        command.setResolvedSpeaker(speaker);
        await addSegment(
            { ...command.newSegment, speaker },
            command.newSegmentId,
        );
    });

    onCommand<UpdateSegmentCommand>(
        Cmds.UpdateSegmentCommand,
        async (command) => {
            const segment = await getSegment(command.segmentId);

            if (!segment) {
                logger.warn("Target segment not found");
                return;
            }

            command.setUndoCommand(
                new UpdateSegmentCommand(command.segmentId, segment),
            );

            await updateSegment(command.segmentId, command.updates);
        },
    );

    onCommand<UpdateSegmentsCommand>(
        Cmds.UpdateSegmentsCommand,
        async (command) => {
            const previous = await updateSegments(command.entries);
            command.setUndoCommand(
                new UpdateSegmentsCommand(
                    previous.map((segment) => ({
                        segmentId: segment.id,
                        updates: segment,
                    })),
                ),
            );
        },
    );

    onCommand<TranscriptionNameChangeCommand>(
        Cmds.TranscriptionNameChangeCommand,
        async (command) => {
            command.setUndoCommand(
                new TranscriptionNameChangeCommand(
                    command.transcriptionId,
                    command.newName,
                    command.oldName,
                ),
            );

            await updateTranscription(command.transcriptionId, {
                name: command.newName,
            });
        },
    );

    onCommand<RenameSpeakerCommand>(
        Cmds.RenameSpeakerCommand,
        async (command) => {
            await db.transcriptions
                .where("id")
                .equals(command.transcriptionId)
                .modify((transcription) => {
                    transcription.speakers = (transcription.speakers ?? []).map(
                        (speaker) =>
                            speaker.id === command.speakerId
                                ? { ...speaker, name: command.newName }
                                : speaker,
                    );
                    transcription.updatedAt = new Date();
                });
        },
    );

    onCommand<MergeSpeakerCommand>(
        Cmds.MergeSpeakerCommand,
        async (command) => {
            const affectedSegments = await db.segments
                .where("transcriptionId")
                .equals(command.transcriptionId)
                .and((segment) => segment.speaker === command.removedSpeaker)
                .toArray();

            const segmentIds = affectedSegments.map((s) => s.id);

            command.setUndoCommand(
                new UnmergeSpeakerCommandClass(
                    command.transcriptionId,
                    command.removedSpeaker,
                    segmentIds,
                ),
            );

            await db.segments
                .where("id")
                .anyOf(segmentIds)
                .modify({ speaker: command.targetSpeaker });

            await db.transcriptions
                .where("id")
                .equals(command.transcriptionId)
                .modify({ updatedAt: new Date() });
        },
    );

    onCommand<UnmergeSpeakerCommand>(
        Cmds.UnmergeSpeakerCommand,
        async (command) => {
            await db.segments
                .where("id")
                .anyOf(command.segmentIds)
                .modify({ speaker: command.removedSpeaker });

            await db.transcriptions
                .where("id")
                .equals(command.transcriptionId)
                .modify({ updatedAt: new Date() });
        },
    );

    onCommand<RestoreSegmentCommand>(
        Cmds.RestoreSegmentCommand,
        async (command) => {
            await putSegment(command.segmentData);
        },
    );
};
