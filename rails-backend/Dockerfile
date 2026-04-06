# Rails Backend Dockerfile
# Production-grade single-stage build

FROM ruby:3.4.8-alpine

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

# Copy application code
COPY . .

# Install gems
RUN bundle install --jobs 4 --retry 3

# Create non-root user
RUN addgroup -g 1000 rails && \
    adduser -D -u 1000 -G rails rails && \
    chown -R rails:rails /app

# Create tmp directory with proper permissions
RUN mkdir -p /app/tmp && \
    chown -R rails:rails /app/tmp && \
    chmod 0755 /app/tmp

# Switch to non-root user
USER rails

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Default command
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]
