// Helper to narrow an error to an HTTP status code
export function isHttpStatusCode(error: unknown, status: number): boolean {
    if (typeof error !== "object" || error === undefined || error === null) {
        return false;
    }
    const e = error as Record<string, unknown>;
    // ofetch/FetchError may have statusCode
    if (typeof e.statusCode === "number" && e.statusCode === status) {
        return true;
    }
    // response?.status is available on some errors
    const resp = e.response as { status?: number } | undefined;
    if (resp && typeof resp.status === "number" && resp.status === status) {
        return true;
    }
    // direct status field fallback
    if (typeof e.status === "number" && e.status === status) {
        return true;
    }
    return false;
}
