# React Native Dockerfile
# Development environment for React Native

# Build arguments for multi-architecture support
ARG TARGETPLATFORM
ARG BUILDPLATFORM

FROM node:18-alpine

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    openjdk17 \
    wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install && \
    chown -R nodejs:nodejs /app

# Copy source code
COPY . .

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose Metro bundler port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8081 || exit 1

# Default command
CMD ["npm", "start"]
