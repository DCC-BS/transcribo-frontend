import type { Vector2d } from 'konva/lib/types';
import type { SegementWithId } from '~/types/transcriptionResponse';

/**
 * Composable for managing timeline segment operations
 */
export function useTimelineSegment() {
    // Snap distance in pixels
    const SNAP_DISTANCE = 5;

    /**
     * Find segments to snap to when dragging or resizing
     * @param segments List of segments
     * @param selectedId ID of currently selected segment
     * @param fromTimetoPixelSpace Function to convert time to pixel coordinates
     */
    function findSnapPoints(
        segments: SegementWithId[],
        selectedId: string | undefined,
        fromTimetoPixelSpace: (time: number) => number
    ): { starts: number[], ends: number[] } {
        // Collect all segment start and end points except the selected one
        const starts: number[] = [];
        const ends: number[] = [];

        segments.forEach(segment => {
            if (segment.id !== selectedId) {
                // Convert time points to pixel positions
                starts.push(fromTimetoPixelSpace(segment.start));
                ends.push(fromTimetoPixelSpace(segment.end));
            }
        });

        return { starts, ends };
    }

    /**
     * Check if a position should snap to nearby segments
     * @param position Current position
     * @param snapPoints List of potential snap points
     */
    function checkSnap(position: number, snapPoints: number[]): number | null {
        for (const snapPoint of snapPoints) {
            if (Math.abs(position - snapPoint) <= SNAP_DISTANCE) {
                return snapPoint;
            }
        }
        return null;
    }

    /**
     * Creates a drag bound function that keeps the segment within stage
     * @param segment The segment to create bound function for
     * @param stageWidth Width of the stage
     * @param speakerIndex Index of the speaker
     * @param heightPerSpeaker Height allocated for each speaker
     * @param fromTimetoPixelSpace Function to convert time to pixels
     * @param marginTop Top margin value
     */
    function createDragBoundFunc(
        segment: any,
        stageWidth: number,
        speakerIndex: number,
        heightPerSpeaker: number,
        fromTimetoPixelSpace: (time: number) => number,
        marginTop: number
    ) {
        return (pos: Vector2d) => {
            const width = fromTimetoPixelSpace(segment.end - segment.start);
            const newX = Math.max(0, Math.min(stageWidth - width, pos.x));
            return {
                x: newX,
                y: speakerIndex * heightPerSpeaker + marginTop,
            };
        };
    }

    return {
        findSnapPoints,
        checkSnap,
        createDragBoundFunc
    };
}
