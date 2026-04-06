#!/bin/bash

# Newman Test Runner for Go Backend (Port 8082)
# This script runs the Postman collection against the Go backend only

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to script directory to ensure relative paths work correctly
cd "$SCRIPT_DIR" || {
    echo -e "${RED}Error: Failed to change to script directory: $SCRIPT_DIR${NC}"
    exit 1
}

echo -e "${BLUE}Script directory: $SCRIPT_DIR${NC}"
echo -e "${BLUE}Current working directory: $(pwd)${NC}\n"

# Configuration
COLLECTION_FILE="Parking Lot API.postman_collection.json"
ENV_FILE="newman-env-8082.json"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Cleanup function to kill backend process on exit
cleanup() {
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${YELLOW}Stopping Go backend (PID: $BACKEND_PID)...${NC}"
        kill "$BACKEND_PID" 2>/dev/null
        # Wait up to 5 seconds for graceful shutdown
        for i in {1..5}; do
            if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
                echo -e "${GREEN}✓ Go backend stopped gracefully${NC}"
                break
            fi
            sleep 1
        done
        # Force kill if still running
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            echo -e "${YELLOW}Force killing Go backend...${NC}"
            kill -9 "$BACKEND_PID" 2>/dev/null
        fi
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Check if Newman is installed
if ! command -v newman &> /dev/null; then
    echo -e "${RED}Error: Newman is not installed${NC}"
    echo -e "${YELLOW}Install it with: npm install -g newman${NC}"
    exit 1
fi

# Check if collection file exists
if [ ! -f "$COLLECTION_FILE" ]; then
    echo -e "${RED}Error: Collection file not found: $COLLECTION_FILE${NC}"
    echo -e "${YELLOW}Current working directory: $(pwd)${NC}"
    echo -e "${YELLOW}Looking for file at: $(realpath "$COLLECTION_FILE" 2>/dev/null || echo "File not found")${NC}"
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Creating environment file: $ENV_FILE${NC}"
    echo -e "${YELLOW}Current working directory: $(pwd)${NC}"
    printf '{"base_url": "http://localhost:8082"}\n' > "$ENV_FILE"
else
    echo -e "${GREEN}✓ Environment file exists: $ENV_FILE${NC}"
    echo -e "${YELLOW}Full path: $(realpath "$ENV_FILE")${NC}"
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

# Check if Go backend is running BEFORE database reset
echo -e "${YELLOW}Checking if Go backend is running on port 8082...${NC}"

# First, try to kill any process listening on port 8082 directly
echo -e "${YELLOW}Checking for processes on port 8082...${NC}"
if command -v lsof &> /dev/null; then
    PORT_PID=$(lsof -ti :8082 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        echo -e "${YELLOW}Found process(es) on port 8082 (PID: $PORT_PID)${NC}"
        echo -e "${YELLOW}Killing process(es) on port 8082 with -9 (SIGKILL)...${NC}"
        kill -9 $PORT_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Kill signal sent to port 8082 processes${NC}"
    else
        echo -e "${GREEN}✓ Port 8082 is not in use${NC}"
    fi
else
    echo -e "${YELLOW}⚠ lsof not available, falling back to health check...${NC}"
fi

# Secondary: Check if health endpoint is still responding (old backend still alive)
if curl -s -f "http://localhost:8082/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Go backend health check still responding${NC}"
    echo -e "${YELLOW}Attempting additional stop methods...${NC}"
    
    # Try pkill as fallback
    if pkill -9 -f "go-backend.*server" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ pkill -9 sent for go-backend.*server${NC}"
    fi
fi

# Wait up to 10 seconds for port to be actually free
echo -e "${YELLOW}Waiting for port 8082 to be released...${NC}"
WAIT_COUNT=0
PORT_FREED=false
while [ $WAIT_COUNT -lt 10 ]; do
    if command -v lsof &> /dev/null; then
        if ! lsof -i :8082 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Port 8082 is now free (verified with lsof)${NC}"
            PORT_FREED=true
            break
        fi
    else
        if ! curl -s -f "http://localhost:8082/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Port 8082 appears to be free (health check failed)${NC}"
            PORT_FREED=true
            break
        fi
    fi
    WAIT_COUNT=$((WAIT_COUNT + 1))
    sleep 1
done

if [ "$PORT_FREED" = false ]; then
    echo -e "${RED}✗ Port 8082 is still in use after 10 seconds${NC}"
    echo -e "${RED}Failed to start server: listen tcp :8082: bind: address already in use${NC}"
    exit 1
fi
echo ""

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

# Reinitialize database schema
if PGPASSWORD="${DATABASE_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f go-backend/scripts/init-db.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database reset successfully${NC}\n"
else
    echo -e "${RED}✗ Failed to reset database${NC}"
    exit 1
fi

# Now start the Go backend for tests (after successful database reset)
echo -e "${YELLOW}Starting Go backend for tests...${NC}"

# Final port verification before starting the backend
echo -e "${YELLOW}Final verification: ensuring port 8082 is completely free...${NC}"
if command -v lsof &> /dev/null; then
    if lsof -i :8082 > /dev/null 2>&1; then
        echo -e "${RED}✗ FATAL: Port 8082 is still in use, cannot start backend${NC}"
        echo -e "${YELLOW}Remaining process on port 8082:${NC}"
        lsof -i :8082
        exit 1
    fi
fi

# Start Go backend in background with proper PID capture
# Create log file for server output
SERVER_LOG="go-server-$TIMESTAMP.log"
(cd go-backend && TZ=UTC go run cmd/server/main.go > "../$SERVER_LOG" 2>&1) &
BACKEND_PID=$!

# Verify the backend PID is valid and process is running
if [ -z "$BACKEND_PID" ]; then
    echo -e "${RED}✗ Failed to capture Go backend PID${NC}"
    exit 1
fi

# Wait a moment for the process to start
sleep 2

# Check if the process is actually running
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${RED}✗ Go backend process (PID: $BACKEND_PID) is not running${NC}"
    echo -e "${YELLOW}Check server log: $SERVER_LOG${NC}"
    if [ -f "$SERVER_LOG" ]; then
        echo -e "${YELLOW}Last 20 lines of server log:${NC}"
        tail -20 "$SERVER_LOG"
    fi
    exit 1
fi

echo -e "${GREEN}✓ Go backend started with PID: $BACKEND_PID${NC}"
echo -e "${YELLOW}Server log: $SERVER_LOG${NC}"

# Wait for server to start and be fully ready
echo -e "${YELLOW}Waiting for Go backend to be ready...${NC}"
SERVER_READY=false
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # Check health endpoint
    if curl -s -f "http://localhost:8082/health" > /dev/null 2>&1; then
        # Health check passed, now verify critical endpoints are accessible
        if curl -s -f "http://localhost:8082/api/v1/sessions" > /dev/null 2>&1; then
            if curl -s -f "http://localhost:8082/api/v1/slots/available?vehicle_type=S&entry_point_id=A" > /dev/null 2>&1; then
                SERVER_READY=true
                break
            fi
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo -e "${YELLOW}Waiting for server... (${RETRY_COUNT}/${MAX_RETRIES})${NC}"
        sleep 1
    fi
done

if [ "$SERVER_READY" = true ]; then
    echo -e "${GREEN}✓ Go backend is running and ready${NC}\n"
else
    echo -e "${RED}✗ Failed to start Go backend or server not ready${NC}"
    echo -e "${YELLOW}Please ensure Go backend can start: cd go-backend && TZ=UTC go run cmd/server/main.go${NC}\n"
    exit 1
fi

# Initialize database with entry points and slots
# Including entry point D to satisfy "Entry point identifiers are valid" assertion
echo -e "${YELLOW}Initializing database with entry points and slots...${NC}"

# NOTE: reset-database seeds entry points A-C (3 total).
# Distances array must have exactly 3 values — one per entry point.
# initialize upserts entry points and creates slots idempotently.
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
  "http://localhost:8082/api/v1/initialize")

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

# Run tests
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Go Backend (Port 8082)${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Current working directory before newman: $(pwd)${NC}"
echo -e "${YELLOW}Collection file: $COLLECTION_FILE${NC}"
echo -e "${YELLOW}Environment file: $ENV_FILE${NC}"
echo -e "${YELLOW}Results file will be: $RESULTS${NC}"

RESULTS="go-results-$TIMESTAMP.json"
REPORT="go-report-$TIMESTAMP.html"
SLIM_RESULTS="go-results-slim-$TIMESTAMP.json"

echo -e "${YELLOW}Running newman command...${NC}"
newman run "$COLLECTION_FILE" \
    -e "$ENV_FILE" \
    -r cli,json,html \
    --reporter-json-export "$RESULTS" \
    --reporter-html-export "$REPORT" \
    --color on

EXIT_CODE=$?
echo -e "${YELLOW}Newman exit code: $EXIT_CODE${NC}"
echo -e "${YELLOW}Results file exists: $([ -f "$RESULTS" ] && echo "YES" || echo "NO")${NC}"

# Generate slim JSON summary
# Note: arithmetic expressions in jq require wrapping in parentheses
echo -e "${YELLOW}Generating slim JSON summary from: $RESULTS${NC}"
echo -e "${YELLOW}Results file exists before jq: $([ -f "$RESULTS" ] && echo "YES" || echo "NO")${NC}"
echo -e "${YELLOW}Current working directory: $(pwd)${NC}"

if [ -f "$RESULTS" ]; then
    jq '{
      collection: .collection.info.name,
      passed: (.run.stats.assertions.total - .run.stats.assertions.failed),
      failed: .run.stats.assertions.failed,
      total: .run.stats.assertions.total,
      failures: [.run.failures[] | {test: .source.name, message: .error.message}]
    }' "$RESULTS" > "$SLIM_RESULTS"
    echo -e "${GREEN}✓ Slim JSON summary generated${NC}"
else
    echo -e "${RED}✗ Results file not found, skipping jq processing${NC}"
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✓ Go Backend Tests Passed${NC}"
else
    echo -e "\n${RED}✗ Go Backend Tests Failed (exit code: $EXIT_CODE)${NC}"
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