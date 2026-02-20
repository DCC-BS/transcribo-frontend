<script setup lang="ts">

</script>

<template>
    <div class="flex flex-col m-2 ring-1 ring-default rounded-md shadow-[2px_2px_1px_1px_#0000000D]">
        <div class="border-b border-default p-2">
            <slot name="top" />
        </div>

        <div class="flex grow min-h-0 p-2">
            <slot />
        </div>
    </div>
</template>
