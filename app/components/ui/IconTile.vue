<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        icon: string;
        tone?: "primary" | "secondary";
        size?: "md" | "lg";
    }>(),
    { tone: "primary", size: "md" },
);

const toneClasses = {
    primary: "bg-(--ui-primary-soft) text-(--ui-primary-strong)",
    secondary: "bg-(--ui-secondary-soft) text-secondary",
} as const;

const sizeClasses = {
    md: "size-11 rounded-xl",
    lg: "size-13 rounded-[14px]",
} as const;
</script>

<template>
    <span
        class="grid flex-none place-items-center"
        :class="[toneClasses[props.tone], sizeClasses[props.size]]"
    >
        <UIcon :name="props.icon" class="size-5" />
    </span>
</template>
