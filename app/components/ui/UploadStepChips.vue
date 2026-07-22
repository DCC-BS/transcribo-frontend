<script setup lang="ts">
import type { StepperItem } from "@nuxt/ui";

const props = defineProps<{ labels: string[] }>();
const step = defineModel<number>({ required: true });

// steps ahead of the current one stay locked — navigation is backwards only
const items = computed<StepperItem[]>(() =>
    props.labels.map((label, index) => ({
        title: label,
        disabled: index + 1 > step.value,
    })),
);

// UStepper counts items zero-based; our step model is 1-based
const current = computed({
    get: () => step.value - 1,
    set: (index) => {
        step.value = index + 1;
    },
});
</script>

<template>
    <UStepper v-model="current" :items="items" size="sm" class="mb-6" />
</template>
