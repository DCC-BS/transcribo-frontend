<template>
    <div>
        <NavigationBar>
            <template #center>
                <slot name="center" />
            </template>
        </NavigationBar>
        <!-- <ClientOnly>
            <UNavigationMenu content-orientation="vertical" variant="link" :items="items"
                class="w-full grid grid-cols-3 items-center z-50 [&>*:nth-child(1)]:justify-self-start [&>*:nth-child(2)]:justify-self-center [&>*:nth-child(3)]:justify-self-end">
                <template #disclaimer>
                    <DisclaimerButton variant="ghost" />
                </template>
</UNavigationMenu>
<template #fallback>
                <div class="w-full h-12 bg-gray-100 animate-pulse rounded"></div>
            </template>
</ClientOnly> -->
    </div>
</template>
