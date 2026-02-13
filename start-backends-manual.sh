#!/bin/bash

# Manual Backend Startup Script
# This script starts Ruby and Go backends without Docker

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Manual Backend Startup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v ruby &> /dev/null; then
    echo -e "${RED}Error: Ruby is not installed${NC}"
    exit 1
fi

if ! command -v go &> /dev/null; then
    echo -e "${RED}Error: Go is not installed${NC}"
    exit 1
fi

if ! command -v bundle &> /dev/null; then
    echo -e "${RED}Error: Bundler is not installed${NC}"
    echo -e "${YELLOW}Install with: gem install bundler${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}\n"

# Function to start Ruby backend
start_ruby_backend() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Starting Ruby Backend (Rails)${NC}"
    echo -e "${BLUE}========================================${NC}\n"
    
    cd rails-backend
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env from .env.example${NC}"
        cp .env.example .env
    fi
    
    # Install dependencies
    echo -e "${YELLOW}Installing Ruby dependencies...${NC}"
    bundle install
    
    # Setup database
    echo -e "${YELLOW}Setting up database...${NC}"
    bundle exec rails db:create 2>/dev/null || true
    bundle exec rails db:migrate
    bundle exec rails db:seed
    
    # Start server
    echo -e "${GREEN}Starting Rails server on port 3000...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
    
    bundle exec rails server -p 3000
}

# Function to start Go backend
start_go_backend() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Starting Go Backend${NC}"
    echo -e "${BLUE}========================================${NC}\n"
    
    cd go-backend
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env from .env.example${NC}"
        cp .env.example .env
    fi
    
    # Download dependencies
    echo -e "${YELLOW}Downloading Go dependencies...${NC}"
    go mod download
    
    # Start server
    echo -e "${GREEN}Starting Go server on port 8082...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"
    
    go run cmd/server/main.go
}

# Function to check if port is in use
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}Error: Port $port is already in use${NC}"
        echo -e "${YELLOW}Process using port $port:${NC}"
        lsof -Pi :$port -sTCP:LISTEN -t
        echo -e "\n${YELLOW}Kill the process or use a different port${NC}"
        return 1
    fi
    
    return 0
}

# Check ports
check_port 3000 "Ruby Backend" || exit 1
check_port 8082 "Go Backend" || exit 1

# Ask which backend to start
echo -e "${YELLOW}Which backend do you want to start?${NC}"
echo -e "1) Ruby Backend (Rails) - Port 3000"
echo -e "2) Go Backend - Port 8082"
echo -e "3) Both Backends (in separate terminals)"
echo -e ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        start_ruby_backend
        ;;
    2)
        start_go_backend
        ;;
    3)
        echo -e "${YELLOW}Starting both backends in separate terminals...${NC}"
        echo -e "${YELLOW}Please open two new terminals and run:${NC}\n"
        echo -e "${GREEN}Terminal 1:${NC}"
        echo -e "  cd $(pwd)"
        echo -e "  ./start-backends-manual.sh"
        echo -e "  Select option 1\n"
        echo -e "${GREEN}Terminal 2:${NC}"
        echo -e "  cd $(pwd)"
        echo -e "  ./start-backends-manual.sh"
        echo -e "  Select option 2\n"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
