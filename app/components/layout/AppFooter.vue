<template>
    <footer class="flex-none">
        <!-- DataBsFooter only ships horizontal padding, so the vertical room
             for the logo is added here, inside its own border -->
        <DataBsFooter
            size="md"
            class="relative border-t border-default bg-default py-2 text-muted"
        >
            <template #right>
                <div class="flex justify-end">
                    <FeedbackControl inline />
                </div>
            </template>
        </DataBsFooter>
    </footer>
</template>
