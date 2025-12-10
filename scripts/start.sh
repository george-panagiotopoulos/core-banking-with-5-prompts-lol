#!/bin/bash

# Core Banking System - Start Script
# This script starts both the backend API server and React frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Core Banking System - Startup Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i ":$1" >/dev/null 2>&1
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"

    # Kill background processes
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    if [ ! -z "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null || true
    fi

    echo -e "${GREEN}Services stopped.${NC}"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node --version) detected"

# Check npm
if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm $(npm --version) detected"

# Build the core banking system if not already built
echo ""
echo -e "${YELLOW}Building core banking system...${NC}"
cd "$PROJECT_ROOT"
if [ ! -d "dist" ]; then
    npm run build || { echo -e "${RED}Failed to build core banking system${NC}"; exit 1; }
fi
echo -e "${GREEN}✓${NC} Core banking system built"

# Install and start the API server
echo ""
echo -e "${YELLOW}Setting up API server...${NC}"
cd "$PROJECT_ROOT/ui/server"

if [ ! -d "node_modules" ]; then
    echo "Installing server dependencies..."
    npm install || { echo -e "${RED}Failed to install server dependencies${NC}"; exit 1; }
fi

# Build server TypeScript
if [ ! -d "dist" ]; then
    echo "Building server..."
    npx tsc || { echo -e "${RED}Failed to build server${NC}"; exit 1; }
fi

# Check if port 3901 is already in use
if port_in_use 3901; then
    echo -e "${YELLOW}Warning: Port 3901 is already in use. Attempting to continue...${NC}"
fi

echo -e "${GREEN}✓${NC} API server ready"

# Install and start the React client
echo ""
echo -e "${YELLOW}Setting up React client...${NC}"
cd "$PROJECT_ROOT/ui/client"

if [ ! -d "node_modules" ]; then
    echo "Installing client dependencies..."
    npm install || { echo -e "${RED}Failed to install client dependencies${NC}"; exit 1; }
fi

echo -e "${GREEN}✓${NC} React client ready"

# Start services
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   Starting Services${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Start API server in background
echo -e "${YELLOW}Starting API server on port 3901...${NC}"
cd "$PROJECT_ROOT/ui/server"
node dist/server.js &
SERVER_PID=$!
sleep 2

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}Failed to start API server${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} API server running at http://localhost:3901"

# Start React client
echo -e "${YELLOW}Starting React client on port 3900...${NC}"
cd "$PROJECT_ROOT/ui/client"
PORT=3900 npm start &
CLIENT_PID=$!
sleep 3

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Banking System UI Started Successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "  ${BLUE}Frontend:${NC}  http://localhost:3900"
echo -e "  ${BLUE}API:${NC}       http://localhost:3901"
echo -e "  ${BLUE}API Docs:${NC}  http://localhost:3901/api/health"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for processes
wait $CLIENT_PID $SERVER_PID
