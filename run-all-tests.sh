#!/bin/bash

# Newman Test Runner for Both Ruby and Go Backends
# This script runs the Postman collection against both backends and generates reports
# Uses environment files to override the base_url variable in the collection

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COLLECTION_FILE="Parking Lot API.postman_collection.json"
RUBY_ENV="newman-env-3000.json"
GO_ENV="newman-env-8082.json"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Check if Newman is installed
if ! command -v newman &> /dev/null; then
    echo -e "${RED}Error: Newman is not installed${NC}"
    echo -e "${YELLOW}Install it with: npm install -g newman${NC}"
    exit 1
fi

# Check if collection file exists
if [ ! -f "$COLLECTION_FILE" ]; then
    echo -e "${RED}Error: Collection file not found: $COLLECTION_FILE${NC}"
    exit 1
fi

# Function to run tests
run_tests() {
    local backend_name=$1
    local env_file=$2
    local results_file=$3
    local report_file=$4
    
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}Testing $backend_name Backend${NC}"
    echo -e "${BLUE}Environment: $env_file${NC}"
    echo -e "${BLUE}========================================${NC}\n"
    
    # Run Newman with environment file
    newman run "$COLLECTION_FILE" \
        -e "$env_file" \
        -r cli,json,html \
        --reporter-json-export "$results_file" \
        --reporter-html-export "$report_file" \
        --color on
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "\n${GREEN}✓ $backend_name Backend Tests Passed${NC}"
    else
        echo -e "\n${RED}✗ $backend_name Backend Tests Failed (exit code: $exit_code)${NC}"
    fi
    
    return $exit_code
}

# Function to check if backend is running
check_backend() {
    local backend_name=$1
    local url=$2
    
    echo -e "${YELLOW}Checking if $backend_name backend is running...${NC}"
    
    if curl -s -f "$url/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $backend_name backend is running${NC}\n"
        return 0
    else
        echo -e "${RED}✗ $backend_name backend is not running or not accessible${NC}"
        echo -e "${YELLOW}Please start the backend before running tests${NC}\n"
        return 1
    fi
}

# Main execution
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Newman Test Runner${NC}"
echo -e "${BLUE}  Parking Lot API - Both Backends${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Timestamp: $TIMESTAMP"
echo -e "Collection: $COLLECTION_FILE"
echo -e ""

# Check if backends are running
BACKENDS_READY=true

check_backend "Ruby" "http://localhost:3000" || BACKENDS_READY=false
check_backend "Go" "http://localhost:8082" || BACKENDS_READY=false

if [ "$BACKENDS_READY" = false ]; then
    echo -e "\n${RED}Error: One or more backends are not running${NC}"
    echo -e "${YELLOW}Start backends with: docker-compose up -d${NC}"
    exit 1
fi

# Run tests for both backends
RUBY_RESULTS="ruby-results-$TIMESTAMP.json"
RUBY_REPORT="ruby-report-$TIMESTAMP.html"
GO_RESULTS="go-results-$TIMESTAMP.json"
GO_REPORT="go-report-$TIMESTAMP.html"

run_tests "Ruby" "$RUBY_ENV" "$RUBY_RESULTS" "$RUBY_REPORT"
RUBY_EXIT=$?

echo -e "\n"

run_tests "Go" "$GO_ENV" "$GO_RESULTS" "$GO_REPORT"
GO_EXIT=$?

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Ruby Backend: $([ $RUBY_EXIT -eq 0 ] && echo "${GREEN}PASSED${NC}" || echo "${RED}FAILED${NC}")"
echo -e "Go Backend:   $([ $GO_EXIT -eq 0 ] && echo "${GREEN}PASSED${NC}" || echo "${RED}FAILED${NC}")"
echo -e "${BLUE}========================================${NC}"

# Report files location
echo -e "\n${YELLOW}Report Files:${NC}"
echo -e "Ruby Results: $RUBY_RESULTS"
echo -e "Ruby Report:  $RUBY_REPORT"
echo -e "Go Results:   $GO_RESULTS"
echo -e "Go Report:    $GO_REPORT"

# Open reports in browser (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "\n${YELLOW}Opening reports in browser...${NC}"
    [ -f "$RUBY_REPORT" ] && open "$RUBY_REPORT"
    [ -f "$GO_REPORT" ] && open "$GO_REPORT"
fi

# Exit with error if any test failed
if [ $RUBY_EXIT -ne 0 ] || [ $GO_EXIT -ne 0 ]; then
    echo -e "\n${RED}Some tests failed. Please review the reports above.${NC}"
    exit 1
fi

echo -e "\n${GREEN}All tests passed successfully!${NC}"
exit 0
