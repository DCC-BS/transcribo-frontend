---
outline: deep
editLink: true
skillName: docker
skillDescription: "Docker containerization standards for DCC-BS projects: multi-stage Dockerfiles, .dockerignore, docker-compose extends pattern (services.compose.yml + dev/prod overrides), alpine/slim images, non-root users, GHCR (ghcr.io/dcc-bs) tagging/CI, hadolint/dive linting, nginx proxy, and Nuxt-layer build-args (AUTH_LAYER_URI, ARG vs ENV). Use when writing/reviewing a Dockerfile or compose file or containerizing a Node/Bun/Nuxt or Python (uv) app."
---
# Internal Docker Standards

This document outlines the mandatory standards and best practices for containerizing applications within our organization. These guidelines ensure consistency, security, and performance across all projects.

# 1. Project Initialization & Structure

Every project must be containerized. The root of the repository must contain the necessary configuration to build and run the application independently.

## File Requirements

`Dockerfile`: Defines the build process.

`.dockerignore`: Excludes unnecessary files from the build context.

`docker-compose.yml`: Defines the production/integration infrastructure.

`docker-compose.dev.yml`: Defines the local development environment.

## The .dockerignore File

To optimize build speed and security, you must exclude all files not required for the application runtime. This prevents secrets (`.env`) and local build artifacts (`node_modules`) from accidentally entering the image.

### Standard Exclusion List
```
.git
.vscode
.editorconfig
.env
README.md
Dockerfile
docker-compose*.yml
node_modules
.venv
__pycache__
.pytest_cache
.nuxt
dist
```

# 2. Dockerfile Development

## Base Images & Tagging

* No `latest` tags: Never depend on the `latest` tag. It is mutable and leads to non-reproducible builds.
* Pin Versions: Use specific version tags (e.g., `node:24-alpine` or `python:3.13-alpine`).
* For Web Applications which are sperated in Frontend and Backend services, ensure compatibility when the Major and Minor version are the same. Patch versions can differ. So for example `1.3.1` and `1.3.5` are compatible, but `1.2.x` and `1.3.x` are not.

* Minimal Base Images: Prefer `alpine` or `slim` (only if `alpine` fails) variants to reduce image size and download time.

## Multi-Stage Builds

Use multi-stage builds to separate build dependencies (compilers, headers, full CLI tools) from runtime dependencies.

1. Build Layer: Compiles code, installs dependencies, builds assets.

2. Run Layer: Copies only the artifacts from the Build Layer.

## Security Context

* Rootless Execution: Containers should not run as root. Create a specific user or use the default non-root user provided by the base image (e.g., `node` user in Node images).

* Privileged Mode: Do not run containers in `--privileged` mode.

* Kubernetes pod security standards prohibit "run as root" containers.

## Nuxt Layer Configuration with Build Arguments

When building Nuxt applications that use our [Nuxt Layers](/nuxt-layers/), some layers require environment variables that specify which implementation to use (e.g., `AUTH_LAYER_URI`, `LOGGER_LAYER_URI`). These variables are resolved at **build time** during `nuxt build`, not at runtime.

::: warning Important
Layer URI environment variables must be passed as Docker **build arguments (ARG)**, not runtime environment variables. If you only set them at runtime, the layer will already be compiled with the wrong (or missing) implementation.
:::

### Required Build Arguments for Nuxt Layers

| Build Argument | Description | Example Value |
|----------------|-------------|---------------|
| `AUTH_LAYER_URI` | Authentication implementation layer | `github:DCC-BS/nuxt-layers/azure-auth` |
| `LOGGER_LAYER_URI` | Logger implementation layer | `github:DCC-BS/nuxt-layers/pino-logger` |

### Dockerfile Pattern

Add these lines to your Nuxt Dockerfile **after `FROM`** and **before** the build step:

```dockerfile
# Define build arguments (available as env vars during RUN commands)
ARG AUTH_LAYER_URI
ARG LOGGER_LAYER_URI

# ... then run the build (ARGs are injected into the shell environment)
RUN bun x nuxi build
```

::: tip No ENV Needed
Docker injects `ARG` values into the shell environment during `RUN` commands. There's no need to duplicate them with `ENV` — the values are available to `nuxt build` via `process.env` and won't persist into the final image.
:::

### Building the Image

Pass the values using `--build-arg`:

```bash
docker build \
  --build-arg AUTH_LAYER_URI=github:DCC-BS/nuxt-layers/azure-auth \
  --build-arg LOGGER_LAYER_URI=github:DCC-BS/nuxt-layers/pino-logger \
  -t my-nuxt-app:latest .
```

### Docker Compose Configuration

In your `docker-compose.yml` or `docker/services.compose.yml`:

```yaml
services:
  app-frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        AUTH_LAYER_URI: ${AUTH_LAYER_URI:-github:DCC-BS/nuxt-layers/no-auth}
        LOGGER_LAYER_URI: ${LOGGER_LAYER_URI:-github:DCC-BS/nuxt-layers/pino-logger}
```

Then create a `.env` file with your desired values or set them in your shell before running `docker compose build`.

### Key Differences: ARG vs ENV

| Aspect | ARG (Build Argument) | ENV (Environment Variable) |
|--------|---------------------|---------------------------|
| **Available during** | `RUN` commands in build stage | Build and runtime |
| **Accessible to processes** | ✅ Injected into shell env during `RUN` | ✅ Always in `process.env` |
| **Set via** | `--build-arg` flag | `-e` flag, `environment:` in compose, or `ENV` instruction |
| **Persisted in image** | ❌ No | ✅ Yes |
| **Use for Layer URIs** | ✅ Yes (build-time only, not persisted) | ❌ Unnecessary duplication |

::: tip Full Documentation
For comprehensive documentation on Nuxt layer configuration and all available layers, see [Nuxt Layers - Environment Configuration in Docker](/nuxt-layers/#environment-configuration-in-docker).
:::

## Examples

### Node.js / Nuxt (Bun)

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS build

# Install Bun
RUN npm install -g bun

WORKDIR /app

# Build arguments for Nuxt layer configuration (see section above)
ARG AUTH_LAYER_URI
ARG LOGGER_LAYER_URI

# Dependency caching layer
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build layer - ARGs are injected as env vars, Nuxt reads via process.env
COPY . .
RUN bun x nuxi prepare
RUN bun x nuxi build

# Stage 2: Runtime (ARGs not needed - layers compiled into .output)
FROM node:24-alpine

WORKDIR /app

# Security: Set non-root user
USER node

# Copy artifacts
COPY --from=build --chown=node:node /app/.output ./

EXPOSE 3000
ENV NODE_ENV=production

ENTRYPOINT ["node", "./server/index.mjs"]
```

### Python (Alpine)
```
# Stage 1: Builder
FROM python:3.13-alpine as builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
# --locked: Sync with lockfile
# --no-dev: Exclude development dependencies
# --no-install-project: Install dependencies only (caching layer)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project --no-editable

# Copy application code
COPY . /app

# Sync project
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable

# Stage 2: Runtime
FROM python:3.13-alpine

WORKDIR /app

# Create non-root user (Alpine syntax)
RUN addgroup -S app && adduser -S app -G app

# Copy the environment, but not the source code
COPY --from=builder --chown=app:app /app/.venv /app/.venv

# Copy application code
COPY . /app

# Enable virtual environment
ENV PATH="/app/.venv/bin:$PATH"

RUN chown -R app:app /app

USER app

CMD ["uv", "run", "main"]
```

# 3. Orchestration & Composition

We utilize a modular Docker Compose strategy to avoid duplication between development and production configurations.

### The "Extends" Pattern

* `docker/services.compose.yml`: The base definition. Contains image names, build contexts, and shared environment variables.

* `docker-compose.dev.yml`: Extends the base. Adds hot-reloading (volumes), debugging ports, and local overrides.

* `docker-compose.yml`: Extends the base. Defines production networks, restart policies, and resource limits.

### Example Directory Structure
```
project-root/
├── docker/
│   └── services.compose.yml
│   └── .env.backend
│   └── nginx.conf
├── Dockerfile
├── .dockerignore
├── docker-compose.dev.yml
├── docker-compose.yml
```

### Syntax Reference
```
# docker-compose.dev.yml
services:
  app-backend:
    extends:
      file: ./docker/services.compose.yml
      service: app-backend
    environment:
      - DEBUG=true
    ports:
      - "8000:8000"
  llm:
    extends:
      file: ./docker/services.compose.yml
      service: llm
```

```
# docker-compose.yml
networks:
  app-network:
    driver: bridge

services:
  nginx:
    extends:
      file: ./docker/services.compose.yml
      service: nginx
    depends_on:
      - app-frontend
    networks:
      - app-network

  llm:
    extends:
      file: ./docker/services.compose.yml
      service: llm
    networks:
      - app-network

  app-backend:
    extends:
      file: ./docker/services.compose.yml
      service: app-backend
    networks:
      - app-network

  app-frontend:
    extends:
      file: ./docker/services.compose.yml
      service: app-frontend
    networks:
      - app-network
```

```
# docker/services.compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - '8090:80'
      - '8443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
  llm:
    platform: linux/amd64
    image: vllm/vllm-openai:v0.11.2
    container_name: llm
    expose:
      - "8000"
    env_file: ".env.backend"
    runtime: nvidia
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [ gpu ]
    ipc: host
    volumes:
      - ~/.cache/huggingface:/root/.cache/huggingface
    command: >
      Qwen/Qwen3-32B-AWQ
      --port 8000
      --max-model-len 10000
      --max-num-seqs 1
      --kv-cache-dtype fp8
      --gpu-memory-utilization 0.95
      --enable-auto-tool-choice
      --tool-call-parser hermes
      --tensor-parallel-size 1
      --reasoning-parser qwen3
      --uvicorn-log-level warning
      --disable-log-requests
  app-backend:
    image: ghcr.io/dcc-bs/app-backend:latest
    expose:
     - "8000"
    env_file:
     - .env.backend
  app-frontend:
    container_name: app-frontend
    build:
      context: .
      dockerfile: ../Dockerfile
    env_file: "../.env"
    environment:
      - NUXT_API_URL=http://app-backend:8000
      - PORT=3000
    expose:
      - 3000
```

```
# nginx.conf
events {
    worker_connections 1024;
}

http {
    # Increase buffer sizes for large headers/cookies
    client_header_buffer_size 16k;
    large_client_header_buffers 4 16k;
    client_max_body_size 50M;
    
    upstream app-frontend {
        server app-frontend:3000;
    }

    upstream app-backend {
        server app-backend:8000;
    }

    # Frontend proxy
    server {
        listen 80;
        server_name localhost;

        # Proxy frontend
        location / {
            proxy_pass http://app-frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Increase proxy buffer sizes for large headers
            proxy_buffer_size 16k;
            proxy_buffers 4 16k;
            proxy_busy_buffers_size 16k;
        }

        # Proxy backend API (with fallback for when backend is down)
        location /backend/ {
            proxy_pass http://app-backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Handle backend unavailable gracefully
            proxy_connect_timeout 2s;
            proxy_send_timeout 2s;
            proxy_read_timeout 2s;
            
            # Return 503 if backend is unavailable
            error_page 502 503 504 = @backend_unavailable;
        }
        
        location @backend_unavailable {
            default_type application/json;
            return 503 '{"error": "Backend service is currently unavailable"}';
        }
    }
}
```
# 4. Quality Assurance & Optimization

## Static Analysis & Linting

* SonarQube: Ensure Dockerfiles are scanned during the CI process to detect security smells (e.g., hardcoded secrets, sudo usage).

* [Hadolint](https://github.com/hadolint/hadolint): Recommended for local linting of Dockerfile syntax.

### Installation

* Windows: scoop install hadolint

* Ubuntu:

```
sudo wget -qO /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64

sudo chmod a+x /usr/local/bin/hadolint
```


### Usage

* Local CLI: hadolint Dockerfile

## Image Optimization

* Size Analysis: Use [Dive](https://github.com/wagoodman/dive) to inspect image layers and identify wasted space.

* Layer Caching: Leverage the build cache by ordering instructions from stable to volatile. Copy dependency definitions (e.g., package.json) and install packages before copying the source code to avoid re-installing dependencies on every code change.

* Clean Artifacts: Clear package manager caches (e.g., apk cache clean, rm -rf /var/lib/apt/lists/*) within the same RUN instruction as the installation to prevent temporary files from committing to the layer.

* Further Reading: [Guide to Reducing Docker Image Size](https://devopscube.com/reduce-docker-image-size/)

# 5. Deployment & CI/CD

## Registry

* Images are pushed to GHCR (GitHub Container Registry).

* Namespace convention: `ghcr.io/dcc-bs/<service-name>`.

## Versioning Strategy

* Development: Tag with the branch name or dev.

* Staging/Production: Tag with the Git Commit SHA (sha-xyz123) and the Semantic Version (v1.0.0).

* Avoid Overwriting: Do not overwrite stable tags.

## CI Workflow

* Checkout Code.

* Lint Dockerfile (Hadolint/SonarQube).

* Build Image (using BuildKit).

* Run Tests against the container.

* Push to GHCR.

# 6. Docker Configuration (Host)

* Rootless Daemon: Run the Docker daemon in rootless mode to mitigate privilege escalation vulnerabilities on the host machine.

* Resource Limits: Configure global resource quotas to prevent a single container from exhausting host memory or CPU.
