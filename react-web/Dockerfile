# React Web Dockerfile
# Production-grade multi-stage build

# Build arguments for multi-architecture support
ARG TARGETPLATFORM
ARG BUILDPLATFORM

# Stage 1: Build
FROM --platform=$BUILDPLATFORM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Install wget for health check
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Set proper ownership
RUN chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

# Switch to non-root user
USER nginx-user

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Default command
CMD ["nginx", "-g", "daemon off;"]
