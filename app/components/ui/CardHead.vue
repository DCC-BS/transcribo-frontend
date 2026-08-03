<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        icon: string;
        title: string;
        subtitle?: string;
        tone?: "primary" | "secondary";
        size?: "md" | "lg";
    }>(),
    { tone: "primary", size: "md", subtitle: undefined },
);
</script>

<template>
    <div class="flex min-w-0 items-center gap-3">
        <IconTile :icon="props.icon" :tone="props.tone" :size="props.size" />
        <div class="min-w-0">
            <strong
                class="block truncate text-[0.95rem]"
                :title="props.title"
            >
                {{ props.title }}
            </strong>
            <small
                v-if="props.subtitle"
                class="text-[0.78rem] text-muted"
            >
                {{ props.subtitle }}
            </small>
        </div>
    </div>
</template>
