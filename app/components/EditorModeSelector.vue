<script setup lang="ts">
import { motion } from "motion-v";
import { UButton } from "#components";

type EditorMode = "view" | "summary" | "edit" | "statistics";

const UButtonMotion = motion.create(UButton);

const props = withDefaults(defineProps<{ idPrefix?: string }>(), {
    idPrefix: "",
});

const mode = defineModel<EditorMode>({ default: "view" });

const { t } = useI18n();

const modes: { value: EditorMode; icon: string; label: string }[] = [
    { value: "view", icon: "i-lucide-eye", label: "viewer" },
    { value: "summary", icon: "i-lucide-sparkles", label: "summary" },
    { value: "edit", icon: "i-lucide-square-pen", label: "editor" },
    { value: "statistics", icon: "i-lucide-bar-chart-2", label: "statistics" },
];
</script>

<template>
    <div
        :id="`${props.idPrefix}editor-mode-selector`"
        class="editor-mode-selector"
    >
        <UFieldGroup :ui="{ base: 'flex justify-stretch' }">
            <UButtonMotion
                v-for="(m, index) in modes"
                :key="m.value"
                :variant="mode === m.value ? 'solid' : 'soft'"
                color="primary"
                :whileHover="{ scale: 1.02 }"
                :whileTap="{ scale: 0.98 }"
                :transition="{
                    type: 'spring' as const,
                    stiffness: 400,
                    damping: 17,
                }"
                class="w-full flex justify-center"
                @click="mode = m.value"
                :id="`${props.idPrefix}mode-${m.value}`"
            >
                <UIcon :name="m.icon" class="h-6 w-6 md:w-4 md:h-4" />
                <span class="hidden md:inline">{{ t(`mode.${m.label}`) }}</span>
            </UButtonMotion>
        </UFieldGroup>
    </div>
</template>
