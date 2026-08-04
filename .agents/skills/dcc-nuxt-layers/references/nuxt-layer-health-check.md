---
outline: deep
editLink: true
skillParent: dcc-nuxt-layers
skillName: nuxt-layer-health-check
skillDescription: "DCC-BS Nuxt layer exposing Kubernetes-ready health endpoints GET api/health/liveness, api/health/readiness, and api/health/startup for container orchestration. Use when configuring liveness/readiness/startup probes or Docker Compose healthchecks for a Nuxt app (not the FastAPI backend-probes)."
---
# Health Check Layer

The health check layer provides Kubernetes-ready health monitoring endpoints for
containerized Nuxt applications. It implements standard health check patterns
that enable container orchestration platforms to monitor application health and
manage pod lifecycle.

## Overview

The health check layer provides three standard endpoints:

- 🟢 **Liveness Probe** (`api/health/liveness`) - Is the application running?
- 🔵 **Readiness Probe** (`api/health/readiness`) - Can the application serve traffic?
- 🟡 **Startup Probe** (`api/health/startup`) - Has the application started successfully?

These endpoints are designed for Kubernetes health checks but work with any container
orchestration platform (Docker Swarm, ECS, etc.).

## Quick Start

### Installation

Add the layer to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: [
    ['github:DCC-BS/nuxt-layers/health_check', { install: true }]
  ]
})
```

That's it! The health check endpoints are immediately available at:

- `GET api/health/liveness`
- `GET api/health/readiness`
- `GET api/health/startup`

### Test the Endpoints

```sh
# Start your Nuxt app
npm run dev

# Test liveness endpoint
curl http://localhost:3000/api/health/liveness

# Test readiness endpoint
curl http://localhost:3000/api/health/readiness

# Test startup endpoint
curl http://localhost:3000/api/health/startup
```

## Health Check Endpoints

### Liveness Probe

**Endpoint**: `GET api/health/liveness`

**Purpose**: Determines if the application is running and responsive.

**When to Use**:

- Kubernetes liveness probes
- Detecting deadlocks or hung processes
- Automatic pod restarts when unhealthy

**Response**:

```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

**HTTP Status Codes**:

- `200 OK` - Application is alive
- `503 Service Unavailable` - Application is not responding (should trigger restart)

**Kubernetes Configuration**:

```yaml
livenessProbe:
  httpGet:
    path: api/health/liveness
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1
```

### Readiness Probe

**Endpoint**: `GET api/health/readiness`

**Purpose**: Determines if the application can handle incoming requests.

**When to Use**:

- Kubernetes readiness probes
- Load balancer health checks
- Determining if pod should receive traffic
- Rolling deployment coordination

**Response**:

```json
{
  "status": "ready",
  "timestamp": 1234567890,
  "checks": {}
}
```

**HTTP Status Codes**:

- `200 OK` - Application is ready to serve traffic
- `503 Service Unavailable` - Application is not ready (remove from load balancer)

**Kubernetes Configuration**:

```yaml
readinessProbe:
  httpGet:
    path: api/health/readiness
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
  successThreshold: 1
```

### Startup Probe

**Endpoint**: `GET api/health/startup`

**Purpose**: Indicates that the application has completed its initialization.

**When to Use**:

- Kubernetes startup probes
- Applications with long startup times
- Preventing premature liveness/readiness checks
- Initial health verification

**Response**:

```json
{
  "status": "started",
  "timestamp": 1234567890
}
```

**HTTP Status Codes**:

- `200 OK` - Application has started successfully
- `503 Service Unavailable` - Application is still starting

**Kubernetes Configuration**:

```yaml
startupProbe:
  httpGet:
    path: api/health/startup
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30
  successThreshold: 1
```

## Kubernetes Integration

### Complete Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nuxt-app
  labels:
    app: nuxt-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nuxt-app
  template:
    metadata:
      labels:
        app: nuxt-app
    spec:
      containers:
      - name: nuxt-app
        image: your-registry/nuxt-app:latest
        ports:
        - containerPort: 3000
          name: http
        
        # Startup probe - runs first
        startupProbe:
          httpGet:
            path: api/health/startup
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30  # 30 * 5s = 150s max startup time
          successThreshold: 1
        
        # Liveness probe - restarts pod if fails
        livenessProbe:
          httpGet:
            path: api/health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3  # Restart after 3 failures
          successThreshold: 1
        
        # Readiness probe - removes from service if fails
        readinessProbe:
          httpGet:
            path: api/health/readiness
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3  # Remove from service after 3 failures
          successThreshold: 1
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Probe Execution Order

1. **Startup probe** runs first and disables liveness/readiness probes
2. Once startup succeeds, **liveness** and **readiness** probes begin
3. **Liveness** probe continues checking if app is alive
4. **Readiness** probe continues checking if app can serve traffic

```txt
Application Start
    ↓
Startup Probe (running)
    ├─ Success → Enable other probes
    └─ Failure → Kill and restart pod
    ↓
Liveness Probe (running)
    ├─ Success → Continue
    └─ Failure → Restart pod
    ↓
Readiness Probe (running)
    ├─ Success → Add to service endpoints
    └─ Failure → Remove from service endpoints
    ↓
Application Running
```

## Docker Compose Integration

Health checks work with Docker Compose too:

```yml
version: '3.8'

services:
  nuxt-app:
    build: .
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000api/health/liveness"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - API_URL=https://api.example.com
    deploy:
      replicas: 2
```

## Related Documentation

- [Backend Communication Layer](./backend_communication.md) - API communication utilities
- [Auth Layer](./auth.md) - Authentication integration
- [Nuxt Layers Overview](./index.md) - Main documentation

## External Resources

- [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Docker Health Checks](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Health Check Patterns](https://microservices.io/patterns/observability/health-check-api.html)
