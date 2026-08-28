# check=skip=SecretsUsedInArgOrEnv
# The build stage runs on the shared mise base image (ghcr.io/dcc-bs/dcc-docker-images/mise)
# which provides the toolchain and the `assemble-runtime` script. The node version lives in
# exactly one place: mise.toml. Change node there and both build and runtime follow automatically.

# Stage 1: Build the application
FROM ghcr.io/dcc-bs/dcc-docker-images/mise:13-slim AS build

ENV APP_MODE=build
ARG LOGGER_LAYER_URI="github:DCC-BS/nuxt-layers/pino-logger"
ENV NODE_ENV=production
ENV DOCKER_BUILD=1

# Set the working directory
WORKDIR /app

# Set Node.js memory limit for build process
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy mise.toml, package.json and bun.lock
COPY ./mise.toml ./package*.json ./bun.lock* ./

# Install the pinned toolchain (node, varlock) from mise.toml
RUN mise trust -a && mise install

# Copy source code
COPY . .

# Build the application
RUN mise run nuxt:prepare
RUN mise run build

# Assemble a minimal runtime: only node + varlock (drop mise, bun, pass-cli,
# usage, node headers, npm/corepack and man/docs). Shared logic from the base image.
RUN assemble-runtime node

# Stage 2: Run the application
# ------------------------------------------------
FROM debian:13-slim

# Set the working directory
WORKDIR /app

# Security: Create and switch to a non-root user
RUN useradd --create-home --uid 1000 node

# Environment
ENV NODE_ENV=production
ENV APP_MODE=prod
ENV NITRO_PORT=3000

# Runtime node is the one assembled from mise in the build stage
ENV PATH="/runtime/node/bin:$PATH"

# Copy the built application and the minimal runtime (node + varlock) from the
# build stage
COPY --from=build --chown=node:node /app/.output ./
COPY --from=build --chown=node:node /app/env.d.ts /app/
COPY --chown=node:node .env*.schema /app/
COPY --from=build --chown=node:node /runtime /runtime

# Switch to the non-root user
USER node

# Expose the port the app runs on
EXPOSE 3000

# Start the application: run varlock's CLI directly with the runtime node
ENTRYPOINT ["node", "/runtime/varlock/bin/cli.js", "run", "--", "node", "./server/index.mjs"]
