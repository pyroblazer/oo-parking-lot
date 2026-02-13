#!/bin/bash
# Docker Compose wrapper with automatic OS/architecture detection
# This script detects the host OS and CPU architecture to set the correct platform
# for Docker builds, eliminating the need to manually set environment variables.

set -e

# Detect OS
OS_TYPE=$(uname -s)
case "$OS_TYPE" in
    Darwin)
        HOST_OS="darwin"
        ;;
    Linux)
        HOST_OS="linux"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        HOST_OS="windows"
        ;;
    *)
        echo "Error: Unknown OS type: $OS_TYPE" >&2
        echo "Supported OS types: Darwin, Linux, MINGW*, MSYS*, CYGWIN*" >&2
        exit 1
        ;;
esac

# Detect CPU architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64|amd64)
        HOST_ARCH="amd64"
        ;;
    aarch64|arm64)
        HOST_ARCH="arm64"
        ;;
    armv7l)
        HOST_ARCH="arm/v7"
        ;;
    *)
        echo "Error: Unknown architecture: $ARCH" >&2
        echo "Supported architectures: x86_64, amd64, aarch64, arm64, armv7l" >&2
        exit 1
        ;;
esac

# Determine Docker platform
# For macOS, we need to use linux/amd64 or linux/arm64 (not darwin)
# For Linux, we use the detected architecture
# For Windows, we use linux/amd64 (WSL2 typically)
if [ "$HOST_OS" = "darwin" ]; then
    # macOS with Apple Silicon (M1/M2/M3)
    if [ "$HOST_ARCH" = "arm64" ]; then
        DOCKER_PLATFORM="linux/arm64"
    else
        # macOS Intel
        DOCKER_PLATFORM="linux/amd64"
    fi
elif [ "$HOST_OS" = "linux" ]; then
    DOCKER_PLATFORM="linux/$HOST_ARCH"
else
    # Windows/WSL2 - default to amd64
    DOCKER_PLATFORM="linux/amd64"
fi

# Display detection results
echo "========================================="
echo "Docker Platform Auto-Detection"
echo "========================================="
echo "Host OS:        $OS_TYPE"
echo "Host Arch:      $ARCH"
echo "Docker Platform: $DOCKER_PLATFORM"
echo "========================================="
echo ""

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not running. Please start Docker and try again." >&2
    exit 1
fi

# Pass all arguments to docker compose
# Export DOCKER_PLATFORM as environment variable for docker-compose.yml to read
export DOCKER_PLATFORM

if command -v docker-compose &> /dev/null; then
    # Use docker-compose (v1) if available
    docker-compose "$@"
elif command -v docker &> /dev/null; then
    # Use docker compose (v2) if available
    docker compose "$@"
else
    echo "Error: Neither docker-compose nor docker compose found. Please install Docker." >&2
    exit 1
fi
