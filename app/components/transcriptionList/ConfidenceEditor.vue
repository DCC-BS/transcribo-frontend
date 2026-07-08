<script lang="ts" setup>
import type { LowConfidenceRange } from "~/types/storedSegments";
import {
    ClearConfidenceOnEdit,
    ConfidenceProbabilityAttribute,
    confidenceLabelKey,
    confidenceTextToHtml,
    htmlToTextAndRanges,
} from "~/utils/confidenceUtils";

const { t } = useI18n();

const text = defineModel<string>({ required: true });
const ranges = defineModel<LowConfidenceRange[]>("ranges", {
    default: () => [],
});

const starterKit = {
    blockquote: false,
    bold: false,
    bulletList: false,
    code: false,
    codeBlock: false,
    dropcursor: false,
    gapcursor: false,
    heading: false,
    italic: false,
    link: false,
    listItem: false,
    listKeymap: false,
    orderedList: false,
    strike: false,
} as const;

const editorUi = {
    base: [
        "px-2.5 sm:px-2.5 py-1.5 text-base/5 [&_p]:leading-5",
        "resize-y overflow-y-auto min-h-8",
        "rounded-md bg-default ring ring-inset ring-accented",
        "focus:ring-2 focus:ring-inset focus:ring-primary",
        "[&_u]:no-underline [&_u]:bg-warning/25 [&_u]:rounded-xs",
    ].join(" "),
};
const extensions = [ConfidenceProbabilityAttribute, ClearConfidenceOnEdit];

const content = ref(confidenceTextToHtml(text.value, ranges.value));
let editorText = text.value;

function handleUpdate(html: unknown): void {
    const extracted = htmlToTextAndRanges(String(html ?? ""));
    editorText = extracted.text;
    ranges.value = extracted.ranges;
    text.value = extracted.text;
}

watch(text, (newText) => {
    if (newText !== editorText) {
        editorText = newText;
        content.value = confidenceTextToHtml(newText, ranges.value);
    }
});

interface HoveredMark {
    probability: number;
    style: Record<string, string>;
}

const wrapper = ref<HTMLElement>();
const hoveredMark = ref<HoveredMark | null>(null);

function onMouseOver(event: MouseEvent): void {
    const mark =
        event.target instanceof Element
            ? event.target.closest("u[data-confidence]")
            : null;
    if (!(mark instanceof HTMLElement) || !wrapper.value) {
        hoveredMark.value = null;
        return;
    }

    const wrapperRect = wrapper.value.getBoundingClientRect();
    const markRect = mark.getBoundingClientRect();
    hoveredMark.value = {
        probability: Number(mark.getAttribute("data-confidence")),
        style: {
            left: `${markRect.left - wrapperRect.left}px`,
            top: `${markRect.top - wrapperRect.top}px`,
            width: `${markRect.width}px`,
            height: `${markRect.height}px`,
        },
    };
}
</script>

<template>
    <!-- biome-ignore lint/a11y/noStaticElementInteractions: hover-only tooltip
         delegation for the marks inside the editor; keyboard interaction with
         the editor itself is unaffected -->
    <div
        ref="wrapper"
        class="relative w-full"
        @mouseover="onMouseOver"
        @mouseleave="hoveredMark = null"
    >
        <UEditor
            :model-value="content"
            content-type="html"
            :starter-kit="starterKit"
            :extensions="extensions"
            :image="false"
            :mention="false"
            class="w-full"
            :ui="editorUi"
            @update:model-value="handleUpdate"
        />
        <UTooltip
            v-if="hoveredMark"
            open
            :text="t(confidenceLabelKey(hoveredMark.probability))"
            :content="{ side: 'top' }"
        >
            <span
                aria-hidden="true"
                class="pointer-events-none absolute"
                :style="hoveredMark.style"
            />
        </UTooltip>
    </div>
</template>
