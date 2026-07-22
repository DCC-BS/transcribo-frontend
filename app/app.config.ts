export default defineAppConfig({
    ui: {
        colors: {
            primary: "bs-purple",
            secondary: "bs-teal",
            warning: "bs-yellow",
            neutral: "neutral",
        },
        card: {
            slots: {
                root: "rounded-2xl shadow-sm",
                body: "p-5 sm:p-5",
            },
        },
    },
});
