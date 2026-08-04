---
name: dcc-nuxt-layers
description: "DCC-BS reusable Nuxt layers — partial Nuxt apps shared across projects via extends: ['github:DCC-BS/nuxt-layers/...']. Use when adding, configuring, or choosing among the five layers: auth (Azure AD/no-auth switching), backend_communication (backendHandlerBuilder), logger (pino), feedback-control (GitHub-issue widget), and health_check (Kubernetes probes)."
---

# dcc-nuxt-layers

DCC-BS reusable Nuxt layers — partial Nuxt apps shared across projects via extends: ['github:DCC-BS/nuxt-layers/...']. Use when adding, configuring, or choosing among the five layers: auth (Azure AD/no-auth switching), backend_communication (backendHandlerBuilder), logger (pino), feedback-control (GitHub-issue widget), and health_check (Kubernetes probes).

### Reference Sub-Guidelines
The following reference sub-guides are available in this skill directory. Read them using your file reading tools as needed:

- **[nuxt-layer-auth](references/nuxt-layer-auth.md)**: DCC-BS Nuxt auth layer with plug-and-play implementation switching via the AUTH_LAYER_URI env var (azure-auth Entra ID vs no-auth). Use when wiring authentication, the useAppAuth() composable, or the authHandler server utility for Bearer-token backend calls in a Nuxt app.
- **[nuxt-layer-backend-communication](references/nuxt-layer-backend-communication.md)**: DCC-BS Nuxt server-route layer exposing backendHandlerBuilder(), a fluent type-safe builder (withMethod, withBodyProvider, withFetcher, withDummyFetcher, postMap, build) for proxying to API_URL. Use when creating Nuxt server API handlers, dummy-data mode, or dynamic [r:]/[q:] path forwarding.
- **[nuxt-layer-feedback-control](references/nuxt-layer-feedback-control.md)**: DCC-BS Nuxt layer providing the <FeedbackControl /> widget that posts user feedback to GitHub issues via /api/feedback. Use when adding emoji-rating feedback, file attachments, or FEEDBACK_REPO/FEEDBACK_GITHUB_TOKEN config — distinct from dcc-ui's general components/composables.
- **[nuxt-layer-health-check](references/nuxt-layer-health-check.md)**: DCC-BS Nuxt layer exposing Kubernetes-ready health endpoints GET api/health/liveness, api/health/readiness, and api/health/startup for container orchestration. Use when configuring liveness/readiness/startup probes or Docker Compose healthchecks for a Nuxt app (not the FastAPI backend-probes).
- **[nuxt-layer-logger](references/nuxt-layer-logger.md)**: DCC-BS frontend Nuxt logging layer with pluggable implementations selected by LOGGER_LAYER_URI (pino-logger). Provides the useLogger() composable and getEventLogger(event) server utility plus breadcrumbs, for both browser and server. Not the Python structlog backend-logger.

