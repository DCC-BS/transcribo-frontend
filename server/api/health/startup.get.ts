/**
 * Startup Probe - /health/startup
 * * Kubernetes uses this for slow-starting applications.
 * It holds off the Liveness/Readiness probes until this returns 200.
 * * Once this passes *once*, it is never checked again for the lifecycle of the pod.
 */

export default defineEventHandler(() => {
    return {
        status: "started",
        timestamp: new Date().toISOString(),
    };
});
