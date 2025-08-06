import type { H3Event } from "h3";

export function getClientIp(event: H3Event): string | undefined {
    const xForwardedFor = event.node.req.headers["x-forwarded-for"];
    if (xForwardedFor) {
        // x-forwarded-for can be a comma-separated list. The first IP is the original client.
        if (Array.isArray(xForwardedFor)) {
            return xForwardedFor[0].split(",")[0].trim();
        }
        return xForwardedFor.split(",")[0].trim();
    }

    return event.node.req.socket.remoteAddress;
}
