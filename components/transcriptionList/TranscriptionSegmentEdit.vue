<script lang="ts" setup>
import { UCard, UTextarea } from '#components';
import {
  SeekToSecondsCommand,
  DeleteSegementCommand,
  InsertSegementCommand,
  UpdateSegementCommand,
} from '~/types/commands';
import type { SegementWithId } from '~/types/transcriptionResponse';

interface TranscriptionListProps {
  segment: SegementWithId;
  speakers: string[];
}

const props = defineProps<TranscriptionListProps>();

const { executeCommand } = useCommandBus();
const internalSegment = ref<SegementWithId>({ ...props.segment });
const isDirty = ref(false);
const { t } = useI18n();

watch(
  () => props.segment,
  (segment) => {
    internalSegment.value = { ...segment };
    isDirty.value = false;
  },
);

watch(
  internalSegment,
  () => {
    if (isDirty.value) {
      return;
    }

    if (
      JSON.stringify(internalSegment.value) !== JSON.stringify(props.segment)
    ) {
      isDirty.value = true;
    }
  },
  { deep: true },
);

function removeSegment(segment: SegementWithId): void {
  executeCommand(new DeleteSegementCommand(segment.id));
}

function addSegmentAfter(segment: SegementWithId): void {
  executeCommand(new InsertSegementCommand(segment.id, {}, 'after'));
}

function addSegmentBefore(segment: SegementWithId): void {
  executeCommand(new InsertSegementCommand(segment.id, {}, 'before'));
}

function seekTo(time: number): void {
  executeCommand(new SeekToSecondsCommand(time));
}

function applyChanges(): void {
  isDirty.value = false;

  const newSegment = internalSegment.value as Record<string, unknown>;
  const oldSegment = props.segment as unknown as Record<string, unknown>;

  // difference between the original segment and the new segment
  const updates = Object.keys(newSegment).reduce(
    (acc: Record<string, unknown>, key) => {
      if (newSegment[key] !== oldSegment[key]) {
        acc[key] = newSegment[key];
      }
      return acc;
    },
    {} as Partial<SegementWithId>,
  );

  executeCommand(new UpdateSegementCommand(internalSegment.value.id, updates));
}

function unDoChanges(): void {
  isDirty.value = false;
  internalSegment.value = { ...props.segment };
}

// Function to handle keydown events in the textarea
function handleKeydown(event: KeyboardEvent): void {
  // Check if Enter is pressed without Shift (Shift+Enter creates a new line)
  if (event.key === 'Enter' && !event.shiftKey) {
    // Prevent the default newline insertion
    event.preventDefault();
    // Apply changes if there are any
    if (isDirty.value) {
      applyChanges();
    }
  }
}

function handleCreateSpeaker(speaker: string): void {
  // Set the new speaker as the current speaker
  internalSegment.value.speaker = speaker;
}

// Round a number to two decimal places
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// Computed properties for rounded input values
const startTimeFormatted = computed({
  get: () => roundToTwoDecimals(internalSegment.value.start),
  set: (value: number) => {
    internalSegment.value.start = value;
  },
});

const endTimeFormatted = computed({
  get: () => roundToTwoDecimals(internalSegment.value.end),
  set: (value: number) => {
    internalSegment.value.end = value;
  },
});
</script>

<template>
  <UCard>
    <UAlert
      v-if="isDirty"
      title=""
      :description="t('transcription.applySpeakerChanges')"
      color="info"
      variant="outline"
      :actions="[
        {
          label: t('transcription.undoChanges'),
          onClick: unDoChanges,
        },
        {
          label: t('transcription.applyChanges'),
          color: 'neutral',
          variant: 'subtle',
          onClick: applyChanges,
        },
      ]"
    />
    <UTextarea
      v-model="internalSegment.text"
      class="w-full"
      @keydown="handleKeydown"
    />

    <div
      class="flex justify-between gap-2 pt-2 flex-wrap"
      @keydown="handleKeydown"
    >
      <USelectMenu
        v-model="internalSegment.speaker"
        :items="props.speakers"
        create-item
        :placeholder="t('transcription.placeholderSpeakerName')"
        @create="handleCreateSpeaker"
      />

      <div class="flex gap-2 items-center">
        <UInput
          v-model="startTimeFormatted"
          type="number"
          class="w-[100px]"
          :step="0.1"
          @keydown="handleKeydown"
        >
          <template #trailing>
            <span class="text-xs">s</span>
          </template>
        </UInput>
        <a @click="() => seekTo(internalSegment.start)">
          {{ formatTime(internalSegment.start) }}
        </a>
        -
        <a @click="() => seekTo(internalSegment.end)">{{
          formatTime(internalSegment.end)
        }}</a>
        <UInput
          v-model="endTimeFormatted"
          type="number"
          class="w-[100px]"
          :step="0.1"
          @keydown="handleKeydown"
        >
          <template #trailing>
            <span class="text-xs">s</span>
          </template>
        </UInput>
      </div>

      <div class="flex gap-2">
        <UButton
          color="primary"
          icon="i-heroicons-arrow-up-on-square-stack"
          @click="addSegmentBefore(internalSegment)"
        />
        <UButton
          color="primary"
          icon="i-heroicons-arrow-down-on-square-stack"
          @click="addSegmentAfter(internalSegment)"
        />
        <UButton
          color="error"
          icon="i-heroicons-trash"
          @click="removeSegment(internalSegment)"
        />
      </div>
    </div>
  </UCard>
</template>

<style lang="scss" scoped>
a {
  cursor: pointer;
  color: var(--color-primary-500);
}

a:hover {
  text-decoration: underline;
}
</style>
