import { useEventListener } from "@vueuse/core";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Rect } from "konva/lib/shapes/Rect";
import type { Transformer } from "konva/lib/shapes/Transformer";
import type { ShallowRef } from "vue";
import type {
    EditorLaneBlock,
    EditorLaneCanvasProps,
    EditorLaneChange,
} from "~/types/editorTimeline";

const LANE_HEIGHT = 44;

interface DragPreview {
    blockId: string;
    targetSpeaker?: string;
    allowed: boolean;
    x: number;
    y: number;
}

interface SelectionState {
    selectedBlockId: Ref<string | undefined>;
    selectedRect: ShallowRef<Rect | undefined>;
    dragPreview: Ref<DragPreview | undefined>;
    hoveredBlockId: Ref<string | undefined>;
}

interface TimelineApi {
    timeToX: (seconds: number) => number;
    xToTime: (x: number) => number;
    laneBounds: (block: EditorLaneBlock) => {
        minStart: number;
        maxEnd: number;
    };
    slotFree: (
        speaker: string,
        start: number,
        end: number,
        ignoredBlockId: string,
    ) => boolean;
    blocksBySpeaker: ComputedRef<Map<string, EditorLaneBlock[]>>;
    blockForId: (blockId: string) => EditorLaneBlock | undefined;
}

/*
    Drag, resize and selection state for the lane canvas. Owns the selected
    block, the live drag preview and the hover highlight, and turns finished
    gestures into `change`/`delete` events for the parent.
*/
export function useLaneInteraction(
    props: EditorLaneCanvasProps,
    onSeek: (seconds: number) => void,
    onChange: (change: EditorLaneChange) => void,
    onDelete: (blockId: string) => void,
    transformer: Ref<{ getNode(): Transformer } | undefined>,
    timeline: TimelineApi,
    selection: SelectionState,
) {
    const { selectedBlockId, selectedRect, dragPreview, hoveredBlockId } =
        selection;
    let dragCommitTimeout: ReturnType<typeof setTimeout> | undefined;

    /**
     * Selects a block and attaches the resize handles to it.
     *
     * @param block - The clicked block.
     * @param event - The Konva click event.
     */
    function selectBlock(
        block: EditorLaneBlock,
        event: KonvaEventObject<MouseEvent>,
    ): void {
        selectedBlockId.value = block.id;
        selectedRect.value = event.target as Rect;
        transformer.value?.getNode().forceUpdate();
        onSeek(block.start);
    }

    /**
     * Clears the selection when the click landed on empty canvas.
     *
     * @param event - The Konva click event.
     */
    function clearSelection(event: KonvaEventObject<MouseEvent>): void {
        if (event.target === event.currentTarget) {
            clearSelectedBlock();
        }
    }

    /**
     * Turns a finished drag into a lane change for the parent.
     *
     * @param block - The dragged block.
     * @param event - The Konva drag event.
     */
    function onBlockDragEnd(
        block: EditorLaneBlock,
        event: KonvaEventObject<DragEvent>,
    ): void {
        const preview = dragPreview.value;
        const rect = event.target as Rect;
        if (preview?.targetSpeaker && !preview.allowed) {
            dragPreview.value = undefined;
            rect.position({
                x: timeline.timeToX(block.start),
                y: props.speakers.ids.indexOf(block.speaker) * LANE_HEIGHT + 8,
            });
            return;
        }
        const start = preview?.targetSpeaker
            ? block.start
            : timeline.xToTime(rect.x());
        onChange({
            blockId: block.id,
            start,
            end: start + (block.end - block.start),
            ...(preview?.targetSpeaker
                ? { targetSpeaker: preview.targetSpeaker }
                : {}),
        });
        clearTimeout(dragCommitTimeout);
        dragCommitTimeout = setTimeout(() => {
            dragPreview.value = undefined;
        }, 2000);
        clearSelectedBlock();
    }

    /**
     * Turns a finished resize into a lane change for the parent.
     *
     * @param block - The resized block.
     */
    function onTransformEnd(block: EditorLaneBlock): void {
        const rect = selectedRect.value;
        if (!rect) {
            return;
        }
        const start = timeline.xToTime(rect.x());
        const end = timeline.xToTime(rect.x() + rect.width() * rect.scaleX());
        rect.scaleX(1);
        onChange({ blockId: block.id, start, end });
        clearSelectedBlock();
    }

    /**
     * Drops the current block selection.
     */
    function clearSelectedBlock(): void {
        selectedBlockId.value = undefined;
        selectedRect.value = undefined;
    }

    watch(
        () => props.blocks,
        (blocks) => {
            const preview = dragPreview.value;
            if (!preview) {
                return;
            }
            const block = blocks.find(
                (candidate) => candidate.id === preview.blockId,
            );
            if (!block) {
                return;
            }
            const expectedStart = preview.targetSpeaker
                ? block.start
                : timeline.xToTime(preview.x);
            const speakerCommitted =
                !preview.targetSpeaker ||
                block.speaker === preview.targetSpeaker;
            if (
                speakerCommitted &&
                Math.abs(block.start - expectedStart) < 0.001
            ) {
                clearTimeout(dragCommitTimeout);
                dragPreview.value = undefined;
            }
        },
    );

    useEventListener(window, "keydown", (event: KeyboardEvent) => {
        if (event.key !== "Delete" && event.key !== "Backspace") {
            return;
        }
        if (!selectedBlockId.value) {
            return;
        }
        const target = event.target as HTMLElement | null;
        if (
            target?.isContentEditable ||
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement
        ) {
            return;
        }
        event.preventDefault();
        onDelete(selectedBlockId.value);
        clearSelectedBlock();
    });

    return {
        selectedBlockId,
        selectedRect,
        dragPreview,
        hoveredBlockId,
        selectBlock,
        clearSelection,
        onBlockDragEnd,
        onTransformEnd,
        clearSelectedBlock,
        clearDragCommitTimeout: () => clearTimeout(dragCommitTimeout),
    };
}
