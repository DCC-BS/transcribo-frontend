# Stage 1: Build the application
FROM node:24-alpine AS build

ENV APP_MODE=build
ENV NODE_ENV=production
ARG LOGGER_LAYER_URI="github:DCC-BS/nuxt-layers/pino-logger"

# Install bun
RUN npm install -g bun

# Set the working directory
WORKDIR /app

# Set Node.js memory limit for build process
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package.json and bun.lock
COPY ./package*.json ./bun.lock* ./

# Install dependencies using bun
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun x nuxi prepare
RUN bun x nuxi build

# Stage 2: Run the application
FROM node:24-alpine

# Set the working directory
WORKDIR /app

# Security: Set non-root user
USER node

# Environment
ENV APP_MODE=prod
ENV NODE_ENV=production
ENV NITRO_PORT=3000

# Copy the built application from the build stage
COPY --from=build --chown=node:node /app/.output ./
COPY --from=build --chown=node:node /app/env.d.ts /app/
COPY --chown=node:node /.env*.schema /app/

COPY --from=ghcr.io/dmno-dev/varlock:latest --chown=node:node /usr/local/bin/varlock /usr/local/bin/varlock

# Expose the port the app runs on
EXPOSE 3000

# Start the application
ENTRYPOINT ["varlock", "run", "--" "node", "./server/index.mjs"]
