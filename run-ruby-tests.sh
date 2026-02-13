#!/bin/bash

# Newman Test Runner for Ruby Backend (Port 3000)
# This script runs Postman collection against Ruby backend only

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COLLECTION_FILE="Parking Lot API.postman_collection.json"
ENV_FILE="newman-env-3000.json"
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
    printf '{"base_url": "http://localhost:3000"}\n' > "$ENV_FILE"
fi

# Check if backend is running
echo -e "${YELLOW}Checking if Ruby backend is running on port 3000...${NC}"

if curl -s -f "http://localhost:3000/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ruby backend is running${NC}\n"
else
    echo -e "${RED}✗ Ruby backend is not running or not accessible${NC}"
    echo -e "${YELLOW}Please start Ruby backend before running tests${NC}"
    echo -e "${YELLOW}Start with: cd rails-backend && bundle exec rails server -p 3000${NC}\n"
    exit 1
fi


# Run tests
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Ruby Backend (Port 3000)${NC}"
echo -e "${BLUE}========================================${NC}\n"

RESULTS="ruby-results-$TIMESTAMP.json"
REPORT="ruby-report-$TIMESTAMP.html"

newman run "$COLLECTION_FILE" \
    -e "$ENV_FILE" \
    -r cli,json,html \
    --reporter-json-export "$RESULTS" \
    --reporter-html-export "$REPORT" \
    --color on

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✓ Ruby Backend Tests Passed${NC}"
else
    echo -e "\n${RED}✗ Ruby Backend Tests Failed (exit code: $EXIT_CODE)${NC}"
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
