<template>
    <div class="flex h-screen flex-col">
        <AppBar />

        <main class="flex min-h-0 grow flex-col overflow-hidden">
            <slot />
        </main>

        <AppFooter />
    </div>
</template>
