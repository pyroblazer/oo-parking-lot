#!/bin/bash

# Newman Test Runner for Go Backend (Port 8082)
# This script runs the Postman collection against the Go backend only

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COLLECTION_FILE="Parking Lot API.postman_collection.json"
ENV_FILE="newman-env-8082.json"
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

# Create environment file if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Creating environment file: $ENV_FILE${NC}"
    printf '{"base_url": "http://localhost:8082"}\n' > "$ENV_FILE"
fi

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking if PostgreSQL is running...${NC}"

# Get PostgreSQL connection details from environment or use defaults
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_USER=${DATABASE_USER:-postgres}
DB_NAME=${DATABASE_NAME:-oo_parking_lot}

# Try to connect to PostgreSQL
if PGPASSWORD="${DATABASE_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is running and accessible${NC}\n"
else
    echo -e "${RED}✗ PostgreSQL is not running or not accessible${NC}"
    echo -e "${YELLOW}Please ensure PostgreSQL is running before running tests${NC}"
    echo -e "${YELLOW}If using Docker Compose, start with: docker-compose up -d postgres${NC}\n"
    exit 1
fi

# Check if backend is running
echo -e "${YELLOW}Checking if Go backend is running on port 8082...${NC}"

if curl -s -f "http://localhost:8082/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Go backend is running${NC}\n"
else
    echo -e "${RED}✗ Go backend is not running or not accessible${NC}"
    echo -e "${YELLOW}Please start the Go backend before running tests${NC}"
    echo -e "${YELLOW}Start with: cd go-backend && TZ=UTC go run cmd/server/main.go${NC}\n"
    exit 1
fi

# Run tests
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Go Backend (Port 8082)${NC}"
echo -e "${BLUE}========================================${NC}\n"

RESULTS="go-results-$TIMESTAMP.json"
REPORT="go-report-$TIMESTAMP.html"

newman run "$COLLECTION_FILE" \
    -e "$ENV_FILE" \
    -r cli,json,html \
    --reporter-json-export "$RESULTS" \
    --reporter-html-export "$REPORT" \
    --color on

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✓ Go Backend Tests Passed${NC}"
else
    echo -e "\n${RED}✗ Go Backend Tests Failed (exit code: $EXIT_CODE)${NC}"
fi

# Report files location
echo -e "\n${YELLOW}Report Files:${NC}"
echo -e "Results: $RESULTS"
echo -e "Report:  $REPORT"

# Open report in browser (macOS only)
if [[ "$OSTYPE" == "darwin"* ]] && [ -f "$REPORT" ]; then
    echo -e "\n${YELLOW}Opening report in browser...${NC}"
    open "$REPORT"
fi

exit $EXIT_CODE
