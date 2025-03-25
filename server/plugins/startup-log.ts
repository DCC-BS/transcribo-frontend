export default defineNitroPlugin(() => {
    // Check if running in development environment
    if (process.env.NODE_ENV === "development") {
        return;
    }

    console.log("App started");

    const config = useRuntimeConfig();

    console.log("Runtime config", config);
});
