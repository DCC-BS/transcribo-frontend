<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";

const props = defineProps<{
    x: number;
    y: number;
    currentSpeaker: string;
    disabledFor?: (target: string) => boolean;
    /** Show a "delete speaker" action at the bottom (lane ⋮ menu only). */
    deletable?: boolean;
}>();

const emit = defineEmits<{
    select: [target: string];
    delete: [];
    close: [];
}>();

const { t } = useI18n();
const { speakerIds, displayName, speakerColors } = useSpeakerRegistry();

const root = ref<HTMLElement>();
onClickOutside(root, () => emit("close"));

const targets = computed(() =>
    speakerIds.value.filter((speaker) => speaker !== props.currentSpeaker),
);
</script>

<template>
    <Teleport to="body">
        <div
            ref="root"
            class="fixed z-90 w-60 rounded-xl border border-default bg-default p-1.5 text-[0.84rem] shadow-md"
            :style="{ left: `${x}px`, top: `${y}px` }"
        >
            <div class="px-2.5 py-1 text-xs font-semibold text-muted">
                {{ t("editor.lanes.moveSegmentsTo") }}
            </div>
            <div class="max-h-56 overflow-y-auto">
                <button
                    v-for="target in targets"
                    :key="target"
                    type="button"
                    class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="disabledFor?.(target) ?? false"
                    @click="emit('select', target)"
                >
                    <span
                        class="size-2.5 flex-none rounded-full"
                        :style="{ background: speakerColors[target] }"
                    />
                    {{ displayName(target) }}
                </button>
            </div>
            <template v-if="deletable">
                <div class="my-1 border-t border-default" />
                <button
                    type="button"
                    class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-error hover:bg-error/10"
                    @click="emit('delete')"
                >
                    <UIcon name="i-lucide-trash-2" class="size-4 flex-none" />
                    {{ t("editor.lanes.deleteSpeaker") }}
                </button>
            </template>
        </div>
    </Teleport>
</template>
