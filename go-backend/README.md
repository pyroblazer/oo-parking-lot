# Go Backend - OO Parking Lot

Go/Golang API implementation for Object-Oriented Mall parking system.

## Dependencies

- **Go**: 1.24.0
- **Google UUID**: 1.6.0 (UUID generation)
- **Gorilla Mux**: 1.8.1 (HTTP router)
- **Asynq**: 0.26.0 (Background job processing)
- **Godotenv**: 1.5.1 (Environment variables)
- **lib/pq**: 1.11.2 (PostgreSQL driver)
- **Zerolog**: 1.34.0 (Structured logging)
- **Redis**: 9.17.3 (Redis client)
- **Testify**: 1.11.1 (Testing framework)

## Setup

1. Install dependencies:
```bash
go mod download
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

3. Run server:
```bash
go run cmd/server/main.go
```

The API will be available at `http://localhost:8082`

## API Endpoints

### Park Vehicle
```
POST /api/v1/parking/sessions
Content-Type: application/json

{
  "vehicle_type": "S",
  "entry_point_id": "A"
}
```

### Unpark Vehicle
```
POST /api/v1/parking/sessions/{id}/unpark
```

### Get Parking Session
```
GET /api/v1/parking/sessions/{id}
```

### List Available Slots
```
GET /api/v1/parking/slots/available?vehicle_type=S&entry_point_id=A
```

### List Entry Points
```
GET /api/v1/parking/entry-points
```

### Health Check
```
GET /health
```

## Database Schema

The system requires PostgreSQL with the following tables:

- `entry_points`: Parking entry points
- `parking_slots`: Available parking slots with distances
- `parking_sessions`: Parking session records

See Rails backend migration files for the exact schema.

## Development

### Using Makefile

The project includes a Makefile for common development tasks:

```bash
# Show all available commands
make help

# Build application
make build

# Run application
make run

# Run tests with coverage
make test

# Run linter
make lint

# Run security scan
make security

# Run all security checks
make security-all

# Clean build artifacts
make clean

# Install security tools
make install-tools

# Run all quality checks
make quality
```

### Using Security Scan Script

For more advanced security scanning options, use the security scan script:

```bash
# Run all security checks (default)
./scripts/security-scan.sh

# Run only gosec
./scripts/security-scan.sh --gosec-only

# Run only golangci-lint
./scripts/security-scan.sh --lint-only

# Fail if any issues are found
./scripts/security-scan.sh --fail-on-error

# Show help
./scripts/security-scan.sh --help
```

### Security Scanning

The project uses two main security scanning tools:

#### GoSec (Go Security Checker)

Gosec inspects Go source code for security problems. It scans for:
- SQL injection vulnerabilities
- Command injection vulnerabilities
- Weak cryptographic usage
- Unsafe use of reflection
- And many more security issues

Run gosec:
```bash
# Using Makefile
make security

# Or directly
gosec -no-fail -fmt sarif -out gosec-results.sarif -verbose=text ./...
```

#### golangci-lint

golangci-lint is a fast Go linters runner. It includes many linters for:
- Code quality
- Performance issues
- Potential bugs
- Code style

Run golangci-lint:
```bash
# Using Makefile
make lint

# Or directly
golangci-lint run --timeout=5m ./...
```

### CI/CD Integration

Security scanning is automatically run in GitHub Actions CI/CD pipeline:
- GoSec runs on every push and pull request
- Results are available as CI/CD artifacts
- SARIF reports are generated for security analysis
- Artifacts are preserved for 30 days for review
- Note: GitHub Security code scanning is not used for this private repository

### Troubleshooting

#### Permission Issues

If you encounter permission errors with the security scan script:
```bash
chmod +x scripts/security-scan.sh
```

#### Tool Installation

If security tools are not found, the script will attempt to install them automatically. You can also install them manually:

```bash
# Install gosec
go install github.com/securego/gosec/v2/cmd/gosec@latest

# Install golangci-lint
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin latest
```

#### Viewing SARIF Reports

SARIF reports are machine-readable. To view them in a more human-readable format:
```bash
# Generate text report
gosec -fmt text -out gosec-results.txt ./...

# View text report
cat gosec-results.txt
```

### Configuration

Security scanning tools can be configured using:

- `.golangci.yml` - golangci-lint configuration
- GoSec command-line options (see `gosec --help`)

For more details, see the [GitHub Actions workflow](../.github/workflows/ci.yml) and [Security documentation](../docs/SECURITY_AND_BEST_PRACTICES.md).
