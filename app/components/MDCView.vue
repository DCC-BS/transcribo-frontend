<script setup lang="ts">
import { detectTextDirection } from "~/utils/textDirection";

const props = defineProps<{
    value: string;
}>();

const direction = computed(() => detectTextDirection(props.value));
</script>

<template>
    <div :dir="direction">
        <MDC :value="props.value" />
    </div>
</template>
