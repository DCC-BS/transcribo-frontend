export default defineAppConfig({
    ui: {
        colors: {
            // Ramp names as shipped by @dcc-bs/common-ui.bs.js (--color-purple-*, …).
            primary: "purple",
            secondary: "teal",
            warning: "yellow",
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
