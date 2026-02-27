export const apiHandler = backendHandlerBuilder().extendFetchOptions(
    async (options) => {
        const clientUUID = getHeader(options.event, "X-Ephemeral-UUID");
        const headers = { "X-Client-Id": clientUUID || "", ...options.headers };

        return { ...options, headers };
    },
);
