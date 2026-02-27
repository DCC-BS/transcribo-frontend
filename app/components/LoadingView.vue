<script setup lang="ts">
import { motion } from "motion-v";

interface InputProps {
    loadingText?: string
}

const props = withDefaults(defineProps<InputProps>(), {
    loadingText: ""
});
</script>

<template>
        <div class="flex items-center justify-center min-h-[60vh]">
            <motion.div :animate="{ opacity: 1, scale: 1 }" :initial="{ opacity: 0, scale: 0.9 }"
                :transition="{ duration: 0.3 }" class="flex flex-col items-center gap-4">
                <div class="relative">
                    <div class="w-16 h-16 border-4 border-primary-200 dark:border-primary-900 rounded-full" />
                    <div
                        class="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary-500 rounded-full animate-spin" />
                </div>
                <p class="text-gray-500 dark:text-gray-400 font-medium animate-pulse">
                    {{ props.loadingText }}
                </p>
            </motion.div>
        </div>
</template>
