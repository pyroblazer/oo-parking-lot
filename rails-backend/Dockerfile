# Rails Backend Dockerfile
# Production-grade multi-stage build

# Build arguments for multi-architecture support
ARG TARGETPLATFORM
ARG BUILDPLATFORM

# Stage 1: Build
FROM --platform=$BUILDPLATFORM ruby:3.4.8-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    postgresql-dev \
    git \
    tzdata \
    yaml-dev \
    bash

# Set working directory
WORKDIR /app

# Copy Gemfile and install dependencies
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment 'true' && \
    bundle config set --local without 'test' && \
    bundle install --jobs 4 --retry 3

# Copy application code
COPY . .

# Stage 2: Production
FROM ruby:3.4.8-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    postgresql-client \
    tzdata \
    curl \
    imagemagick

# Create non-root user
RUN addgroup -g 1000 rails && \
    adduser -D -u 1000 -G rails rails

# Set working directory
WORKDIR /app

# Copy gems from builder
COPY --from=builder --chown=rails:rails /usr/local/bundle /usr/local/bundle

# Copy application code from builder
COPY --from=builder --chown=rails:rails /app /app

# Switch to non-root user
USER rails

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Default command
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]
