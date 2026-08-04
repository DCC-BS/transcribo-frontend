---
outline: deep
editLink: true
skillParent: dcc-backend
skillName: backend-probes
skillDescription: "dcc_backend_common.fastapi_health_probes module for Kubernetes health checks. Use when mounting health_probe_router(service_dependencies) to expose /health/liveness, /health/readiness, and /health/startup endpoints with external dependency checks."
---
# Health Probes

The `dcc_backend_common.fastapi_health_probes` module provides Kubernetes-ready health check endpoints that follow best practices for container orchestration.

## Overview

The module provides:

- **Liveness Probe**: Checks if the application process is running
- **Readiness Probe**: Checks if the app is ready to handle requests
- **Startup Probe**: Checks if the application has finished initialization
- **Automatic log suppression**: Health endpoints excluded from access logs
- **Dependency health checks**: Configurable external service monitoring

## Installation

The health probes module is part of the `dcc-backend-common` package:

```bash
uv add dcc-backend-common
```

## Quick Start

```python
from fastapi import FastAPI
from dcc_backend_common.fastapi_health_probes import health_probe_router

app = FastAPI()

# Define external service dependencies
service_dependencies = [
    {
        "name": "database",
        "health_check_url": "http://postgres:5432/health",
        "api_key": None  # Optional API key for authenticated health checks
    },
    {
        "name": "external-api",
        "health_check_url": "https://api.example.com/health",
        "api_key": "your-api-key-here"
    }
]

# Include health probe router
app.include_router(health_probe_router(service_dependencies))
```

## Available Endpoints

### Liveness Probe

**`GET /health/liveness`**

| Aspect | Description |
|--------|-------------|
| **Purpose** | Checks if the application process is running and not deadlocked |
| **K8s Action** | If this fails, the container is **killed and restarted** |
| **Rule** | Keep it simple. Do **NOT** check databases or external dependencies here |

**Response:**

```json
{
  "status": "up",
  "uptime_seconds": 123.45
}
```

### Readiness Probe

**`GET /health/readiness`**

| Aspect | Description |
|--------|-------------|
| **Purpose** | Checks if the app is ready to handle user requests |
| **K8s Action** | If this fails, **traffic stops** being sent to this pod |
| **Rule** | Check critical dependencies here (databases, external APIs, etc.) |

**Response (healthy):**

```json
{
  "status": "ready",
  "checks": {
    "database": "healthy",
    "external-api": "healthy"
  }
}
```

**Response (unhealthy - returns HTTP 503):**

```json
{
  "status": "unhealthy",
  "checks": {
    "database": "error: Connection refused",
    "external-api": "unhealthy (status: 503)"
  },
  "error": "Service unavailable"
}
```

### Startup Probe

**`GET /health/startup`**

| Aspect | Description |
|--------|-------------|
| **Purpose** | Checks if the application has finished initialization |
| **K8s Action** | **Blocks** liveness/readiness probes until this returns 200 |
| **Rule** | Useful for apps that need to load large ML models or caches on boot |

**Response:**

```json
{
  "status": "started",
  "timestamp": "2025-12-04T10:30:00.000000+00:00"
}
```

## Configuration

### Service Dependencies

Define the external services your application depends on:

```python
from dcc_backend_common.fastapi_health_probes import ServiceDependency

service_dependencies: list[ServiceDependency] = [
    {
        "name": "llm-service",
        "health_check_url": "http://llm:8080/health",
        "api_key": None
    },
    {
        "name": "ocr-service", 
        "health_check_url": "http://ocr:8080/health",
        "api_key": "secret-key"
    }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `str` | Human-readable name for the service |
| `health_check_url` | `str` | URL to check for service health |
| `api_key` | `str \| None` | Optional API key sent as Bearer token |

### Timeouts

The readiness probe uses a **5 second timeout** for each dependency check. Dependencies that don't respond within this time are marked as unhealthy.

## Features

### Automatic Logging Suppression

Health check endpoints are automatically excluded from uvicorn access logs to reduce noise. This prevents log spam from Kubernetes probes hitting your endpoints every few seconds.

### Authentication Support

For services requiring authentication, provide an `api_key`. It will be sent as a Bearer token in the `Authorization` header:

```python
{
    "name": "secure-service",
    "health_check_url": "https://api.example.com/health",
    "api_key": "your-api-key"  # Sent as: Authorization: Bearer your-api-key
}
```

### Kubernetes-Ready Status Codes

| Scenario | HTTP Status | Meaning |
|----------|-------------|---------|
| All checks pass | `200 OK` | Pod is healthy |
| Any dependency fails | `503 Service Unavailable` | Pod should not receive traffic |

## Kubernetes Configuration

Example Kubernetes deployment configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-service:latest
          ports:
            - containerPort: 8000
          livenessProbe:
            httpGet:
              path: /health/liveness
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/readiness
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /health/startup
              port: 8000
            initialDelaySeconds: 0
            periodSeconds: 5
            failureThreshold: 30  # Allow 2.5 minutes for slow startups
```

## Complete Example

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from dcc_backend_common.config import AppConfig
from dcc_backend_common.logger import init_logger, get_logger
from dcc_backend_common.fastapi_health_probes import health_probe_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    init_logger()
    config = AppConfig.from_env()
    logger = get_logger(__name__)
    logger.info("Application started", config=str(config))
    yield
    logger.info("Application shutting down")


app = FastAPI(lifespan=lifespan)

# Configure health probes with your service dependencies
service_dependencies = [
    {
        "name": "llm",
        "health_check_url": "http://llm-service:8080/health",
        "api_key": None
    },
    {
        "name": "database",
        "health_check_url": "http://postgres:5432/health", 
        "api_key": None
    }
]

app.include_router(health_probe_router(service_dependencies))
```

::: tip Source Code
The full implementation is available on GitHub: [dcc_backend_common/fastapi_health_probes/router.py](https://github.com/DCC-BS/backend-common/blob/main/src/dcc_backend_common/fastapi_health_probes/router.py)
:::
