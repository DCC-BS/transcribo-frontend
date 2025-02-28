<script lang="ts" setup>

</script>

<template>
    <div>
        <SplitView>
            <template #a>
                <TranscribeList />
            </template>
            <template #b>
                <TranscribeDetail />
            </template>
        </SplitView>
    </div>
</template>


<style scoped>
/* Add styles relevant to TranscribeView here */
</style>