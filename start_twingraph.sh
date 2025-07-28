#!/bin/bash

# TwinGraph Linux/macOS Startup Script
# This script handles all prerequisites and starts all TwinGraph services
# Usage: ./start_twingraph.sh [--skip-install] [--dev-mode]

set -e

SKIP_INSTALL=false
DEV_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --dev-mode)
            DEV_MODE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-install] [--dev-mode]"
            exit 1
            ;;
    esac
done

echo "🚀 TwinGraph Container Orchestration Engine - Linux/macOS Setup"
echo "==============================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
port_available() {
    ! nc -z localhost "$1" 2>/dev/null
}

# Check prerequisites
echo "📋 Checking prerequisites..."

MISSING_PREREQS=()

if ! command_exists docker; then
    MISSING_PREREQS+=("Docker")
fi

if ! command_exists python3; then
    MISSING_PREREQS+=("Python 3.10+")
else
    PYTHON_VERSION=$(python3 --version 2>&1)
    PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | grep -oE '[0-9]+' | head -1)
    PYTHON_MINOR=$(echo "$PYTHON_VERSION" | grep -oE '[0-9]+' | sed -n '2p')
    
    if [[ $PYTHON_MAJOR -lt 3 ]] || [[ $PYTHON_MAJOR -eq 3 && $PYTHON_MINOR -lt 10 ]]; then
        MISSING_PREREQS+=("Python 3.10+ (found $PYTHON_VERSION)")
    fi
fi

if ! command_exists node; then
    MISSING_PREREQS+=("Node.js 18+")
else
    NODE_VERSION=$(node --version 2>&1)
    NODE_MAJOR=$(echo "$NODE_VERSION" | grep -oE '[0-9]+' | head -1)
    
    if [[ $NODE_MAJOR -lt 18 ]]; then
        MISSING_PREREQS+=("Node.js 18+ (found $NODE_VERSION)")
    fi
fi

if ! command_exists poetry; then
    echo "Poetry not found, attempting to install..."
    if command_exists pip3; then
        pip3 install poetry
        if [[ $? -eq 0 ]]; then
            echo "✅ Poetry installed successfully!"
            # Add poetry to PATH for current session
            export PATH="$HOME/.local/bin:$PATH"
        else
            MISSING_PREREQS+=("Poetry (pip install failed)")
        fi
    else
        MISSING_PREREQS+=("Poetry")
    fi
fi

if [[ ${#MISSING_PREREQS[@]} -gt 0 ]]; then
    echo "❌ Missing prerequisites:"
    for prereq in "${MISSING_PREREQS[@]}"; do
        echo "   - $prereq"
    done
    echo ""
    echo "Please install the missing prerequisites:"
    echo "  • Docker: https://docs.docker.com/get-docker/"
    echo "  • Python 3.10+: https://www.python.org/downloads/"
    echo "  • Node.js 18+: https://nodejs.org/"
    echo "  • Poetry: pip3 install poetry"
    echo ""
    echo "On macOS with Homebrew:"
    echo "  brew install docker python@3.11 node poetry"
    echo ""
    echo "On Ubuntu/Debian:"
    echo "  sudo apt update && sudo apt install docker.io python3 python3-pip nodejs npm"
    echo "  pip3 install poetry"
    exit 1
fi

echo "✅ All prerequisites found!"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker."
    exit 1
fi

echo "✅ Docker is running!"

if [[ "$SKIP_INSTALL" != "true" ]]; then
    # Install Python dependencies
    echo "📦 Installing Python dependencies..."
    
    # Configure Poetry to use in-project virtual environment
    poetry config virtualenvs.in-project true
    
    # Install dependencies
    if ! poetry install; then
        echo "❌ Failed to install Python dependencies"
        exit 1
    fi
    
    echo "✅ Python dependencies installed!"
    
    # Install UI dependencies
    echo "📦 Installing UI dependencies..."
    cd twingraph-ui
    
    # Try normal install first, fallback to legacy peer deps
    if ! npm install --silent; then
        echo "⚠️  Normal npm install failed, trying with --legacy-peer-deps..."
        if ! npm install --legacy-peer-deps --silent; then
            echo "❌ Failed to install UI dependencies"
            cd ..
            exit 1
        fi
    fi
    
    cd ..
    echo "✅ UI dependencies installed!"
fi

# Clean up any existing containers and services
echo "🧹 Cleaning up existing containers and services..."

# Stop and remove existing containers
CONTAINERS_TO_CLEAN=("redis" "gremlin-server" "twingraph" "tinkergraph-server" "tinkergraph-viz" "rabbitmq" "redis-stack")
for container in "${CONTAINERS_TO_CLEAN[@]}"; do
    if [[ -n "$(docker ps -a -q -f name="$container")" ]]; then
        echo "   Stopping and removing $container..."
        docker stop "$container" >/dev/null 2>&1 || true
        docker rm "$container" >/dev/null 2>&1 || true
    fi
done

# Stop docker-compose services
docker-compose down --remove-orphans >/dev/null 2>&1 || true

echo "✅ Cleanup completed!"

# Start services
echo "🚀 Starting TwinGraph services..."

# Start Docker Compose services (includes Redis, Gremlin, and other services)
echo "   Starting Docker services..."
if ! docker-compose up -d >/dev/null 2>&1; then
    echo "❌ Failed to start Docker services"
    echo "   Trying fallback: starting individual containers..."
    
    # Fallback: Start individual containers if docker-compose fails
    echo "   Starting Redis container..."
    docker run --name redis -d -p 6379:6379 redis:alpine >/dev/null
    
    echo "   Starting Gremlin server..."
    docker run --name gremlin-server -d -p 8182:8182 tinkerpop/gremlin-server:3.7.2 >/dev/null
    
    echo "   Starting Graph Visualizer..."
    docker run --name gremlin-viz -d -p 3000:3000 prabushitha/gremlin-visualizer:latest >/dev/null
fi

echo "✅ Docker services started!"

# Wait for services to be ready
echo "⏳ Waiting for services to initialize..."
sleep 5

# Start API server in background
echo "   Starting API server..."
poetry run python -m twingraph.api.main &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start UI development server
echo "   Starting UI development server..."
cd twingraph-ui
npm run dev &
UI_PID=$!
cd ..

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Display service URLs
echo ""
echo "🎉 TwinGraph is starting up!"
echo "============================================"
echo "📊 Web UI:              http://localhost:4000"
echo "🔧 API Server:          http://localhost:8000"
echo "📚 API Documentation:   http://localhost:8000/docs"
echo "📈 Graph Visualizer:    http://localhost:3000"
echo "🔗 Redis:               localhost:6379"
echo "🌐 Gremlin Server:      ws://localhost:8182/gremlin"
echo "============================================"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping TwinGraph services..."
    
    # Stop background processes
    if [[ ! -z "$API_PID" ]]; then
        kill $API_PID 2>/dev/null || true
    fi
    if [[ ! -z "$UI_PID" ]]; then
        kill $UI_PID 2>/dev/null || true
    fi
    
    # Stop Docker services
    docker-compose down >/dev/null 2>&1 || true
    
    echo "✅ All services stopped!"
    exit 0
}

# Register cleanup on exit
trap cleanup EXIT INT TERM

if [[ "$DEV_MODE" == "true" ]]; then
    echo ""
    echo "🔧 Development Mode - Services running in background"
    echo "Process IDs: API=$API_PID, UI=$UI_PID"
    echo "To stop services manually:"
    echo "  kill $API_PID $UI_PID && docker-compose down"
else
    echo ""
    echo "Press Ctrl+C to stop all services..."
    
    # Monitor processes and keep script running
    while true; do
        # Check if processes are still running
        if ! kill -0 $API_PID 2>/dev/null; then
            echo "❌ API server stopped unexpectedly"
            break
        fi
        if ! kill -0 $UI_PID 2>/dev/null; then
            echo "❌ UI server stopped unexpectedly"
            break
        fi
        
        sleep 5
    done
fi