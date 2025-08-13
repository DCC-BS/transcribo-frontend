const filter_secrets = (str: string) => {
    const secrets = ["githubToken"];
    return secrets.reduce((acc, secret) => {
        return acc.replace(
            new RegExp(`"${secret}":"([^"]+)"`, "g"),
            `"${secret}":"********"`,
        );
    }, str);
};

export default defineNitroPlugin(() => {
    // Check if running in development environment
    if (process.env.NODE_ENV === "development") {
        return;
    }

    console.log("App started");

    const config = useRuntimeConfig();

    console.log("Runtime config", filter_secrets(JSON.stringify(config)));
});
