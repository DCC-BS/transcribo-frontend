# Stage 1: Build the application
FROM node:23-alpine AS build

# Install bun
RUN npm install -g bun

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY ./package*.json ./

# Install dependencies using bun
RUN bun install

# Copy the rest of the application code
COPY . .

# Build the application
RUN bun x nuxi prepare
RUN bun x nuxi build

# Stage 2: Run the application
FROM node:23-alpine

# Set the working directory
WORKDIR /app

# Copy the built application from the build stage
COPY --from=build /app/.output ./

# Expose the port the app runs on
EXPOSE 3000

# Start the application
ENTRYPOINT ["node", "./server/index.mjs"]
