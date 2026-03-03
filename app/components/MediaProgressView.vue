<script lang="ts" setup>
import { motion } from 'motion-v';
import { getProgress, type MediaProgress } from '~/types/mediaProgress';

interface InputProps {
    media: File | Blob,
    mediaName: string,
    progressSteps: MediaProgress[]
}

const props = defineProps<InputProps>();
</script>

<template>
    <!-- Media File Card with Upload Animation -->
    <div class="relative w-full max-w-lg">
        <!-- File Card -->
        <motion.div :animate="{ opacity: 1, y: 0 }" :initial="{ opacity: 0, y: 20 }" :transition="{
            type: 'spring',
            stiffness: 200,
            damping: 20,
        }"
            class="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-gray-900/10 dark:shadow-black/30 ring-1 ring-gray-200/50 dark:ring-gray-700/50 overflow-hidden">
            <!-- File Header -->
            <div class="relative px-6 py-4 bg-linear-to-r from-blue-500 to-purple-600">
                <div class="flex items-center gap-3">
                    <!-- File Icon -->
                    <div
                        class="relative w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <UIcon :name="isVideoFile(props.media)
                            ? 'i-lucide-video'
                            : 'i-lucide-file-audio'
                            " class="w-6 h-6 text-white" />
                    </div>
                    <!-- File Name -->
                    <div class="flex-1 min-w-0">
                        <p class="text-white font-semibold truncate">
                            {{ props.mediaName }}
                        </p>
                        <p class="text-white/80 text-xs">
                            {{
                                isVideoFile(props.media)
                                    ? "Video"
                                    : "Audio"
                            }}
                            •
                            {{
                                props.media.type
                                    .split("/")[1]
                                    ?.toUpperCase()
                            }}
                        </p>
                    </div>
                    <!-- Status Badge -->
                    <div class="flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                        <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span class="text-white text-xs font-medium">
                            Processing
                        </span>
                    </div>
                </div>
            </div>

            <!-- File Content Area -->
            <div class="p-8">
                <!-- Progress Steps -->
                <div class="mt-6 space-y-4">
                    <motion.div v-for="progress in props.progressSteps" :animate="{ opacity: 1, x: 0 }"
                        :initial="{ opacity: 0, x: -20 }" :transition="{ delay: 0.2, duration: 0.5 }"
                        class="flex items-center gap-3">
                        <div
                            class="w-8 h-8 bg-linear-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <UIcon :name="progress.icon" class="w-4 h-4 text-white" />
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-gray-900 dark:text-white">
                                {{ progress.message }}
                            </p>
                            <UProgress v-model="progress.progress" />
                        </div>
                        <div class="flex items-center justify-center">
                            <UIcon v-if="getProgress(progress) < 100" name="i-lucide-loader-2"
                                class="w-5 h-5 text-teal-500 animate-spin" />
                            <UIcon v-if="getProgress(progress) >= 100" name="i-lucide-check-circle-2"
                                class="w-5 h-5 text-blue-500" />
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    </div>
</template>
