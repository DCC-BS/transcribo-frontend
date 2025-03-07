<script lang="ts" setup>
import TranscriptionListItem from './TranscriptionSegmentEdit.vue';
const { segments, speakers } = useCurrentTranscription();

</script>

<template>
    <div class="flex flex-col gap-4">
        <div v-for="segment in segments" :key="segment.text + segment.start">
            <TranscriptionListItem :segment="segment" :speakers="speakers" />
        </div>
    </div>
</template>