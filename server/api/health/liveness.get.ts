/**
 * Liveness Probe - /health/liveness
 * * Kubernetes uses this to know if the container is running.
 * If this fails, the container is KILLED and RESTARTED.
 * * CRITICAL: Do NOT check databases or external services here.
 * If your DB is down, you want your pod to stay up (and just fail readiness),
 * not constantly restart.
 */

export default defineEventHandler(() => {
    // This lightweight check ensures the Nitro event loop is not blocked.
    return {
        status: "up",
        uptime: process.uptime(),
    };
});
