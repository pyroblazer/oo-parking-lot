# Go Backend Dockerfile
# Production-grade multi-stage build

# Build arguments for multi-architecture support
ARG TARGETPLATFORM
ARG BUILDPLATFORM

# Stage 1: Build
FROM --platform=$BUILDPLATFORM golang:1.24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server/main.go

# Stage 2: Production
FROM alpine:3.18

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    curl

# Create non-root user
RUN addgroup -g 1000 app && \
    adduser -D -u 1000 -G app app

# Set working directory
WORKDIR /app

# Copy binaries from builder
COPY --from=builder --chown=app:app /app/main ./main

# Copy scripts directory from builder
COPY --from=builder --chown=app:app /app/scripts ./scripts

# Switch to non-root user
USER app

# Expose port
EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8082/health || exit 1

# Default command
CMD ["./main"]
