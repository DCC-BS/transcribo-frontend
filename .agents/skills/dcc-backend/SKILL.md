---
name: dcc-backend
description: "Shared Python library dcc-backend-common for FastAPI services. Use when building or maintaining a DCC backend and needing its reusable modules: config (Pydantic AppConfig/LlmConfig), structlog logging, fastapi_health_probes (Kubernetes probes), fastapi_error_handling, usage_tracking, and the Pydantic AI llm_agent framework. Routes to the matching module reference."
---

# dcc-backend

Shared Python library dcc-backend-common for FastAPI services. Use when building or maintaining a DCC backend and needing its reusable modules: config (Pydantic AppConfig/LlmConfig), structlog logging, fastapi_health_probes (Kubernetes probes), fastapi_error_handling, usage_tracking, and the Pydantic AI llm_agent framework. Routes to the matching module reference.

### Reference Sub-Guidelines
The following reference sub-guides are available in this skill directory. Read them using your file reading tools as needed:

- **[backend-config](references/backend-config.md)**: dcc_backend_common.config module for type-safe settings. Use when defining AppConfig/AbstractAppConfig/LlmConfig with Pydantic, loading env vars via get_env_or_throw, masking secrets with log_secret, or running the generate-env-example / sync-env-with-example CLI tools.
- **[backend-error-handler](references/backend-error-handler.md)**: dcc_backend_common.fastapi_error_handling module for standardized API errors. Use when raising ApiErrorException, choosing ApiErrorCodes (INVALID_REQUEST, RESOURCE_NOT_FOUND, etc.), shaping the ErrorResponse JSON, or registering the handler with inject_api_error_handler(app).
- **[backend-llm-agent](references/backend-llm-agent.md)**: dcc_backend_common.llm_agent module: a Pydantic AI agent framework (pydantic_ai extra). Use when subclassing BaseAgent, streaming with run/run_stream_text/run_stream_events, configuring LlmConfig, adding postprocessors (trim_text, replace_eszett), or debugging via withDebbuger.
- **[backend-logger](references/backend-logger.md)**: dcc_backend_common.logger module for structured logging built on structlog. Use when calling init_logger() at startup and get_logger(__name__), choosing JSON (IS_PROD) vs colored console output, or tuning FocusedTracebackFormatter / DEV_TRACEBACK_STYLE tracebacks.
- **[backend-probes](references/backend-probes.md)**: dcc_backend_common.fastapi_health_probes module for Kubernetes health checks. Use when mounting health_probe_router(service_dependencies) to expose /health/liveness, /health/readiness, and /health/startup endpoints with external dependency checks.
- **[backend-usage-tracking](references/backend-usage-tracking.md)**: dcc_backend_common.usage_tracking module for privacy-compliant usage events. Use when logging events with UsageTrackingService.log_event() and pseudonymizing user IDs via HMAC-SHA256 (get_pseudonymized_user_id) for OpenSearch-compatible structured logs.

