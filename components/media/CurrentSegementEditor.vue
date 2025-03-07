<script lang="ts" setup>
import TranscriptionListItem from '../transcriptionList/TranscriptionSegmentEdit.vue';

interface CurrentSegmentEditorProps {
    currentTime: number,
}

const props = defineProps<CurrentSegmentEditorProps>();

const { segments, speakers } = useCurrentTranscription();

// Function to get currently visible segments based on current time
const currentSegments = computed(() => {
    // Return segments that include the current time
    return segments.value.filter(segment =>
        props.currentTime >= segment.start &&
        props.currentTime < segment.end
    );
});
</script>

<template>
    <div>
        <div v-for="segment in currentSegments" :key="segment.text + segment.start">
            <TranscriptionListItem :segment="segment" :speakers="speakers" />
        </div>
    </div>
</template>