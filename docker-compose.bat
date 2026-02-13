@echo off
REM Docker Compose wrapper with automatic OS/architecture detection for Windows
REM This script detects CPU architecture to set correct platform for Docker builds
REM eliminating the need to manually set environment variables.

setlocal enabledelayedexpansion

REM Detect CPU architecture using wmic
for /f "tokens=2 delims==" %%I in ('wmic os get osarchitecture /value') do set "ARCH=%%I"

REM Remove spaces from architecture string
set ARCH=%ARCH: =%

REM Determine Docker platform
if "%ARCH%"=="64-bit" (
    set DOCKER_PLATFORM=linux/amd64
) else if "%ARCH%"=="ARM64" (
    set DOCKER_PLATFORM=linux/arm64
) else (
    echo Error: Unknown architecture: %ARCH% >&2
    echo Supported architectures: 64-bit, ARM64 >&2
    exit /b 1
)

REM Check if Docker is running
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker is not running. Please start Docker and try again. >&2
    exit /b 1
)

REM Display detection results
echo =========================================
echo Docker Platform Auto-Detection
echo ========================================
echo Host OS:        Windows
echo Host Arch:      %ARCH%
echo Docker Platform: %DOCKER_PLATFORM%
echo =========================================
echo.

REM Pass all arguments to docker compose
REM Export DOCKER_PLATFORM as environment variable for docker-compose.yml
set DOCKER_PLATFORM=%DOCKER_PLATFORM%

where docker-compose >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    docker-compose %*
) else (
    docker compose %*
)
