# Makefile for Go Backend - Parking Lot System
# Provides convenient commands for development, testing, and security scanning

.PHONY: help build run test test-setup lint security security-all clean install-tools install-gosec install-golangci-lint

# Variables
BINARY_NAME=parking-lot-server
CMD_DIR=./cmd/server
BUILD_DIR=./build
COVERAGE_FILE=coverage.out
GOSEC_REPORT=gosec-results.sarif
GOSEC_REPORT_TXT=gosec-results.txt

# Default target
help:
	@echo "Available targets:"
	@echo "  make build              - Build the application"
	@echo "  make run                - Run the application"
	@echo "  make test               - Run tests with coverage"
	@echo "  make test-setup         - Setup test databases"
	@echo "  make lint               - Run golangci-lint"
	@echo "  make security           - Run gosec security scan"
	@echo "  make security-all       - Run all security checks (gosec + golangci-lint)"
	@echo "  make clean              - Clean build artifacts"
	@echo "  make install-tools      - Install all security tools"
	@echo "  make install-gosec      - Install gosec"
	@echo "  make install-golangci-lint - Install golangci-lint"

# Build the application
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	go build -o $(BUILD_DIR)/$(BINARY_NAME) $(CMD_DIR)/main.go
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Run the application
run:
	@echo "Running $(BINARY_NAME)..."
	go run $(CMD_DIR)/main.go

# Setup test databases
test-setup:
	@echo "Setting up test databases..."
	@go run ./cmd/test-setup/main.go

# Run tests with coverage
test: test-setup
	@echo "Running tests..."
	go test -v -race -coverprofile=$(COVERAGE_FILE) -covermode=atomic ./...
	@echo "Coverage report generated: $(COVERAGE_FILE)"
	@go tool cover -html=$(COVERAGE_FILE) -o coverage.html
	@echo "HTML coverage report: coverage.html"

# Run golangci-lint
lint:
	@echo "Running golangci-lint..."
	golangci-lint run --timeout=5m ./...

# Run gosec security scan
security:
	@echo "Running gosec security scan..."
	gosec -no-fail -fmt sarif -out $(GOSEC_REPORT) -verbose=text -stdout ./...
	@echo "SARIF report generated: $(GOSEC_REPORT)"
	@echo "To view results in a more readable format:"
	@echo "  gosec -fmt text -out $(GOSEC_REPORT_TXT) ./..."

# Run all security checks
security-all: lint security
	@echo "All security checks completed!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -f $(COVERAGE_FILE)
	@rm -f coverage.html
	@rm -f $(GOSEC_REPORT)
	@rm -f $(GOSEC_REPORT_TXT)
	@echo "Clean complete"

# Install all security tools
install-tools: install-gosec install-golangci-lint
	@echo "All security tools installed!"

# Install gosec
install-gosec:
	@echo "Installing gosec..."
	@which gosec > /dev/null 2>&1 || (echo "gosec not found, installing..." && go install github.com/securego/gosec/v2/cmd/gosec@latest)
	@echo "gosec installed successfully"

# Install golangci-lint
install-golangci-lint:
	@echo "Installing golangci-lint..."
	@which golangci-lint > /dev/null 2>&1 || (echo "golangci-lint not found, installing..." && curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $$(go env GOPATH)/bin latest)
	@echo "golangci-lint installed successfully"

# Development setup
dev-setup: install-tools
	@echo "Development environment setup complete!"
	@echo "Run 'make help' to see available commands"

# Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...
	@echo "Code formatted"

# Tidy dependencies
tidy:
	@echo "Tidying dependencies..."
	go mod tidy
	@echo "Dependencies tidied"

# Vet code
vet:
	@echo "Vetting code..."
	go vet ./...
	@echo "Code vetted"

# Run all quality checks
quality: fmt tidy vet lint test security-all
	@echo "All quality checks passed!"
