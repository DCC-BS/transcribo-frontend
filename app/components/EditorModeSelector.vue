<script setup lang="ts">
import { motion } from "motion-v";
import { UButton } from "#components";

type EditorMode = "view" | "summary" | "edit" | "statistics";

const UButtonMotion = motion.create(UButton)

const mode = defineModel<EditorMode>({ default: "view" });

const { t } = useI18n();

const modes: { value: EditorMode; icon: string; label: string }[] = [
    { value: "view", icon: "i-lucide-eye", label: "viewer" },
    { value: "summary", icon: "i-lucide-sparkles", label: "summary" },
    { value: "edit", icon: "i-lucide-square-pen", label: "editor" },
    { value: "statistics", icon: "i-lucide-bar-chart-2", label: "statistics" },
];

const containerRef = ref<HTMLDivElement>();
const buttonRefs = ref<(HTMLButtonElement | undefined)[]>([]);

const indicatorStyle = ref({ x: 0, width: 0 });

function updateIndicator(): void {
    const activeIndex = modes.findIndex((m) => m.value === mode.value);
    const button = buttonRefs.value[activeIndex];
    const container = containerRef.value;

    if (button && container) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        indicatorStyle.value = {
            x: buttonRect.left - containerRect.left,
            width: buttonRect.width,
        };
    }
}

onMounted(() => {
    updateIndicator();
});

watch(mode, () => {
    nextTick(updateIndicator);
});

watch(
    () => buttonRefs.value,
    () => {
        nextTick(updateIndicator);
    },
    { deep: true }
);

function storeButton(el: Element | globalThis.ComponentPublicInstance | null, index: number) {
    if(el && "$el" in el) {
        buttonRefs.value[index] = el.$el;
    }

    buttonRefs.value[index] = undefined;
}
</script>

<template>
    <UFieldGroup>
        <UButtonMotion
            v-for="(m, index) in modes"
            :key="m.value"
            :variant="mode === m.value ? 'solid' : 'soft'"
            color="primary"
            :ref="(el) => storeButton(el, index)"
            :whileHover="{ scale: 1.02 }"
            :whileTap="{ scale: 0.98 }"
            :transition="{ type: 'spring' as const, stiffness: 400, damping: 17 }"
            @click="mode = m.value">
            <UIcon :name="m.icon" class="w-4 h-4" />
            <span>{{ t(`mode.${m.label}`) }}</span>
        </UButtonMotion>

    </UFieldGroup>
</template>
