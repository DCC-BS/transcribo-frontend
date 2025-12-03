import { apiFetch, isApiError } from "@dcc-bs/communication.bs.js";

type ReadinessCheck = {
    status: "ready" | "unhealthy";
    checks: {
        api: "connected" | "disconnected" | "unknown";
    };
};

/**
 * Readiness Probe - /health/readiness
 * * Kubernetes uses this to know if the pod is ready to accept traffic.
 * If this fails, the pod is removed from the Service endpoints (load balancer).
 * * Use this to check critical dependencies (upstream APIs, DBs, other).
 */

export default defineEventHandler(async () => {
    const healthCheck: ReadinessCheck = {
        status: "ready",
        checks: {
            api: "unknown",
        },
    };

    try {
        const config = useRuntimeConfig();
        const response = await apiFetch<ReadinessCheck>(
            `${config.apiUrl}/health/readiness`,
        );

        if (isApiError(response)) {
            throw new Error(
                `Upstream API health check failed: ${response.status} ${response.debugMessage}`,
            );
        }

        // Simulate a successful check for now
        healthCheck.checks.api = "connected";

        return healthCheck;
    } catch (error) {
        // If a critical dependency fails, we must return a 503.
        // This tells K8s to stop sending traffic to this specific pod.
        throw createError({
            statusCode: 503,
            statusMessage: "Service Unavailable",
            data: {
                status: "unhealthy",
                error: error instanceof Error ? error.message : "Unknown error",
            },
        });
    }
});
