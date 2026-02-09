<script setup lang="ts">
</script>

<template>
    <NavigationMenu />
    <div class="h-[600px] md:h-[calc(100vh-100px)] flex flex-col overflow-auto">
        <div class="grow">
            <slot />
        </div>
        <DataBsFooter />
    </div>
</template>
