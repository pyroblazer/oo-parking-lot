#!/bin/bash
# Security Scanning Script for Go Backend
# This script runs various security checks on the Go codebase
# Usage: ./scripts/security-scan.sh [options]
#
# Options:
#   --gosec-only       Run only gosec scan
#   --lint-only        Run only golangci-lint
#   --all              Run all security checks (default)
#   --fail-on-error    Exit with error if any issues are found
#   --help             Show this help message

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Default options
RUN_GOSEC=true
RUN_LINT=true
FAIL_ON_ERROR=false
GOSEC_REPORT="gosec-results.sarif"
GOSEC_REPORT_TXT="gosec-results.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print help message
print_help() {
    cat << EOF
Security Scanning Script for Go Backend

Usage: $0 [options]

Options:
  --gosec-only       Run only gosec scan
  --lint-only        Run only golangci-lint
  --all              Run all security checks (default)
  --fail-on-error    Exit with error if any issues are found
  --help             Show this help message

Examples:
  $0                          # Run all security checks
  $0 --gosec-only             # Run only gosec
  $0 --lint-only              # Run only golangci-lint
  $0 --fail-on-error          # Fail if any issues are found

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --gosec-only)
            RUN_GOSEC=true
            RUN_LINT=false
            shift
            ;;
        --lint-only)
            RUN_GOSEC=false
            RUN_LINT=true
            shift
            ;;
        --all)
            RUN_GOSEC=true
            RUN_LINT=true
            shift
            ;;
        --fail-on-error)
            FAIL_ON_ERROR=true
            shift
            ;;
        --help)
            print_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            print_help
            exit 1
            ;;
    esac
done

# Check if required tools are installed
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        print_warning "$1 is not installed. Attempting to install..."
        return 1
    fi
    return 0
}

# Install gosec if not present
install_gosec() {
    print_info "Installing gosec..."
    go install github.com/securego/gosec/v2/cmd/gosec@latest
    if [ $? -eq 0 ]; then
        print_success "gosec installed successfully"
    else
        print_error "Failed to install gosec"
        return 1
    fi
}

# Install golangci-lint if not present
install_golangci_lint() {
    print_info "Installing golangci-lint..."
    curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b "$(go env GOPATH)/bin" latest
    if [ $? -eq 0 ]; then
        print_success "golangci-lint installed successfully"
    else
        print_error "Failed to install golangci-lint"
        return 1
    fi
}

# Run gosec security scan
run_gosec() {
    print_info "Running gosec security scan..."
    
    # Check if gosec is installed
    if ! check_tool gosec; then
        if ! install_gosec; then
            print_error "Cannot run gosec scan"
            if [ "$FAIL_ON_ERROR" = true ]; then
                exit 1
            fi
            return
        fi
    fi
    
    # Run gosec
    local gosec_exit_code=0
    gosec -no-fail -fmt sarif -out "$GOSEC_REPORT" -verbose=text -stdout ./... || gosec_exit_code=$?
    
    # Also generate a text report for easier reading
    gosec -fmt text -out "$GOSEC_REPORT_TXT" ./... || true
    
    if [ $gosec_exit_code -eq 0 ]; then
        print_success "gosec scan completed successfully"
        print_info "SARIF report: $GOSEC_REPORT"
        print_info "Text report: $GOSEC_REPORT_TXT"
    else
        print_warning "gosec found some issues"
        print_info "Check $GOSEC_REPORT_TXT for details"
        if [ "$FAIL_ON_ERROR" = true ]; then
            exit 1
        fi
    fi
}

# Run golangci-lint
run_golangci_lint() {
    print_info "Running golangci-lint..."
    
    # Check if golangci-lint is installed
    if ! check_tool golangci-lint; then
        if ! install_golangci_lint; then
            print_error "Cannot run golangci-lint"
            if [ "$FAIL_ON_ERROR" = true ]; then
                exit 1
            fi
            return
        fi
    fi
    
    # Run golangci-lint
    local lint_exit_code=0
    golangci-lint run --timeout=5m ./... || lint_exit_code=$?
    
    if [ $lint_exit_code -eq 0 ]; then
        print_success "golangci-lint completed successfully"
    else
        print_warning "golangci-lint found some issues"
        if [ "$FAIL_ON_ERROR" = true ]; then
            exit 1
        fi
    fi
}

# Main execution
main() {
    print_info "Starting security scan for Go backend..."
    print_info "Project root: $PROJECT_ROOT"
    
    # Check Go version
    print_info "Go version: $(go version)"
    
    # Run selected checks
    if [ "$RUN_GOSEC" = true ]; then
        run_gosec
    fi
    
    if [ "$RUN_LINT" = true ]; then
        run_golangci_lint
    fi
    
    print_success "Security scan completed!"
    
    if [ "$FAIL_ON_ERROR" = false ]; then
        print_info "Note: The scan completed but may have found issues. Check the reports above."
        print_info "To fail on errors, run with --fail-on-error flag"
    fi
}

# Run main function
main
