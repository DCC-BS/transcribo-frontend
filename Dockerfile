# check=skip=SecretsUsedInArgOrEnv
# Both stages run on the mise-managed toolchain (node, varlock) so the node
# version lives in exactly one place: mise.toml. Change node there and both
# the build and runtime images follow automatically.

# Stage 1: Build the application
FROM debian:13-slim AS build

ENV APP_MODE=build
ARG LOGGER_LAYER_URI="github:DCC-BS/nuxt-layers/pino-logger"
ENV NODE_ENV=production
ENV DOCKER_BUILD=1

RUN apt-get update \
    && apt-get -y --no-install-recommends install sudo curl git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

SHELL ["/bin/bash", "-o", "pipefail", "-c"]
ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV MISE_STATE_DIR="/mise/state"
ENV MISE_INSTALL_PATH="/mise/bin/mise"
ENV PATH="/mise/bin:/mise/shims:$PATH"

# install mise
RUN curl https://mise.run | sh

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
# usage and node headers). Uses a stable path so stage 2 never hardcodes the
# node version — it follows whatever mise.toml pins.
RUN RUNTIME_DIR="/runtime" \
    && mkdir -p "$RUNTIME_DIR/node" "$RUNTIME_DIR/varlock" \
    && cp -r /mise/installs/node/lts/bin /mise/installs/node/lts/lib /mise/installs/node/lts/share "$RUNTIME_DIR/node/" \
    && cp -r /mise/installs/npm-varlock/latest/node_modules/varlock/* "$RUNTIME_DIR/varlock/" \
    && rm -rf "$RUNTIME_DIR/node/include"

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

# varlock resolves @plugin() from the schema against node_modules; ship the
# plugin so it does not try to download it from npm at container startup
COPY --from=build --chown=node:node /app/node_modules/@varlock/proton-pass-plugin /app/node_modules/@varlock/proton-pass-plugin

COPY --from=build --chown=node:node /runtime /runtime

# Switch to the non-root user
USER node

# Expose the port the app runs on
EXPOSE 3000

# Start the application: run varlock's CLI directly with the runtime node
ENTRYPOINT ["node", "/runtime/varlock/bin/cli.js", "run", "--", "node", "./server/index.mjs"]
