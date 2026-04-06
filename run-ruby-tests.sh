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

# Get PostgreSQL connection details from environment or use defaults
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_USER=${DATABASE_USER:-postgres}
DB_NAME=${DATABASE_NAME:-oo_parking_lot}

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking if PostgreSQL is running...${NC}"

if PGPASSWORD="${DATABASE_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is running and accessible${NC}\n"
else
    echo -e "${RED}✗ PostgreSQL is not running or not accessible${NC}"
    echo -e "${YELLOW}Please ensure PostgreSQL is running before running tests${NC}"
    echo -e "${YELLOW}If using Docker Compose, start with: docker-compose up -d postgres${NC}\n"
    exit 1
fi

# Kill all connections to the database (most important step)
echo -e "${YELLOW}Terminating all connections to database...${NC}"
PGPASSWORD="${DATABASE_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
AND pid <> pg_backend_pid();
" 2>/dev/null || true
sleep 1

# Drop and recreate the database entirely (most reliable approach)
echo -e "${YELLOW}Resetting database...${NC}"
PGPASSWORD="${DATABASE_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" 2>/dev/null || true
sleep 1
PGPASSWORD="${DATABASE_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null || true
sleep 1

# Reinitialize database schema with Rails migrations
echo -e "${YELLOW}Running Rails migrations...${NC}"
if cd rails-backend && bundle exec rails db:migrate RAILS_ENV=development > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database migrations completed successfully${NC}\n"
    cd - > /dev/null
else
    echo -e "${RED}✗ Failed to run Rails migrations${NC}"
    cd - > /dev/null
    exit 1
fi

# Check if Ruby backend is running BEFORE continuing with tests
echo -e "${YELLOW}Checking if Ruby backend is running on port 3000...${NC}"

# Verify Ruby backend is running for tests
if curl -s -f "http://localhost:3000/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ruby backend is running and ready for tests${NC}\n"
else
    echo -e "${RED}✗ Ruby backend is not running or not accessible${NC}"
    echo -e "${YELLOW}Please start Ruby backend before running tests${NC}"
    echo -e "${YELLOW}Start with: cd rails-backend && bundle exec rails server -p 3000${NC}\n"
    exit 1
fi

# Initialize database with entry points and slots.
#
# IMPORTANT — Ruby backend constraints (initializations_controller.rb):
#   - distances.length != 3 is rejected with a 422 error — always exactly 3 values
#   - Entry point index is calculated as: identifier.ord - 'A'.ord  (A=0, B=1, C=2)
#   - A 4th entry point (D) would have index=3, which is out of bounds for a 3-value array
#   - Therefore: only A, B, C are valid entry points in the Ruby backend
#
# This is fundamentally different from the Go backend which supports 6 entry points (A-F).
echo -e "${YELLOW}Initializing database with entry points and slots...${NC}"

INIT_DATA='{
  "entry_points": [
    {"identifier": "A", "name": "Entry Point A"},
    {"identifier": "B", "name": "Entry Point B"},
    {"identifier": "C", "name": "Entry Point C"}
  ],
  "parking_slots": [
    {"slot_label": "SP-1", "slot_type": "SP", "distances": [5,  15, 25]},
    {"slot_label": "SP-2", "slot_type": "SP", "distances": [10, 5,  15]},
    {"slot_label": "SP-3", "slot_type": "SP", "distances": [15, 5,  5]},
    {"slot_label": "MP-1", "slot_type": "MP", "distances": [10, 10, 20]},
    {"slot_label": "MP-2", "slot_type": "MP", "distances": [20, 10, 10]},
    {"slot_label": "LP-1", "slot_type": "LP", "distances": [15, 15, 15]},
    {"slot_label": "LP-2", "slot_type": "LP", "distances": [2,  5,  6]}
  ]
}'

INIT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$INIT_DATA" \
  "http://localhost:3000/api/v1/initialize")

INIT_SUCCESS=$(echo "$INIT_RESPONSE" | jq -r '.success // empty')

if [ "$INIT_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ Database initialized successfully${NC}\n"
else
    echo -e "${RED}✗ Failed to initialize database${NC}"
    echo -e "${YELLOW}Response: $INIT_RESPONSE${NC}"
    exit 1
fi

# Wait for initialization to complete and data to be persisted
sleep 1

# Create an active session for "Delete Slot with Active Sessions" test
# vehicle_type: "S" | "M" | "L"
# entry_point_id: identifier string e.g. "A" (resolved via GetByIDentifier)
echo -e "${YELLOW}Creating active session for Delete Slot test...${NC}"

PARK_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"vehicle_type": "S", "entry_point_id": "A"}' \
  "http://localhost:3000/api/v1/sessions")

echo -e "${YELLOW}Park response: $PARK_RESPONSE${NC}"

SESSION_ID=$(echo "$PARK_RESPONSE" | jq -r '.data.session_id // empty')
SLOT_ID=$(echo "$PARK_RESPONSE" | jq -r '.data.parking_slot.id // empty')

if [ -n "$SESSION_ID" ] && [ -n "$SLOT_ID" ]; then
    echo -e "${GREEN}✓ Active session created (Session: $SESSION_ID, Slot: $SLOT_ID)${NC}\n"
    
    # Save active_slot_id to environment file for Delete Slot test
    jq --arg slot_id "$SLOT_ID" '. + {"active_slot_id": $slot_id}' "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
    echo -e "${GREEN}✓ Saved active_slot_id to environment file${NC}\n"
else
    echo -e "${RED}✗ Failed to create active session${NC}"
    echo -e "${YELLOW}Full response: $PARK_RESPONSE${NC}"
    echo -e "${YELLOW}Continuing anyway — Delete Slot with Active Sessions test may fail${NC}\n"
fi

# Run tests
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Ruby Backend (Port 3000)${NC}"
echo -e "${BLUE}========================================${NC}\n"

RESULTS="ruby-results-$TIMESTAMP.json"
REPORT="ruby-report-$TIMESTAMP.html"
SLIM_RESULTS="ruby-results-slim-$TIMESTAMP.json"

newman run "$COLLECTION_FILE" \
    -e "$ENV_FILE" \
    -r cli,json,html \
    --reporter-json-export "$RESULTS" \
    --reporter-html-export "$REPORT" \
    --color on

EXIT_CODE=$?

# Generate slim JSON summary
# Note: arithmetic expressions in jq require wrapping in parentheses
jq '{
  collection: .collection.info.name,
  passed: (.run.stats.assertions.total - .run.stats.assertions.failed),
  failed: .run.stats.assertions.failed,
  total: .run.stats.assertions.total,
  failures: [.run.failures[] | {test: .source.name, message: .error.message}]
}' "$RESULTS" > "$SLIM_RESULTS"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✓ Ruby Backend Tests Passed${NC}"
else
    echo -e "\n${RED}✗ Ruby Backend Tests Failed (exit code: $EXIT_CODE)${NC}"
fi

# Report files location
echo -e "\n${YELLOW}Report Files:${NC}"
echo -e "Results: $RESULTS"
echo -e "Slim:    $SLIM_RESULTS"
echo -e "Report:  $REPORT"

# Open report in browser — cross-platform (macOS M1 + Linux i7)
if [ -f "$REPORT" ]; then
    echo -e "\n${YELLOW}Opening report in browser...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$REPORT"                      # macOS (M1 or Intel)
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$REPORT"                  # Linux with desktop environment
    else
        echo -e "${YELLOW}Report saved to: $REPORT (open manually)${NC}"
    fi
fi

exit $EXIT_CODE