export const apiHandler = backendHandlerBuilder().extendFetchOptions(
    async (options) => {
        const clientId = getHeader(options.event, "x-client-id");

        return {
            ...options,
            headers: {
                ...options.headers,
                "X-Client-Id": clientId ?? "",
            },
        };
    },
);
