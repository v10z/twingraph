@echo off
REM TwinGraph Windows Startup Script (Batch version)
REM This script handles all prerequisites and starts all TwinGraph services
REM Usage: start_twingraph.bat [skip-install]

setlocal enabledelayedexpansion

set SKIP_INSTALL=false
if "%1"=="skip-install" set SKIP_INSTALL=true

echo 🚀 TwinGraph Container Orchestration Engine - Windows Setup
echo ============================================================

REM Check prerequisites
echo 📋 Checking prerequisites...

set MISSING_PREREQS=
where docker >nul 2>&1
if errorlevel 1 set MISSING_PREREQS=!MISSING_PREREQS! Docker

where python >nul 2>&1
if errorlevel 1 set MISSING_PREREQS=!MISSING_PREREQS! Python

where node >nul 2>&1
if errorlevel 1 set MISSING_PREREQS=!MISSING_PREREQS! Node.js

where poetry >nul 2>&1
if errorlevel 1 (
    echo Poetry not found, attempting to install...
    pip install poetry
    if errorlevel 1 set MISSING_PREREQS=!MISSING_PREREQS! Poetry
)

if not "!MISSING_PREREQS!"=="" (
    echo ❌ Missing prerequisites: !MISSING_PREREQS!
    echo.
    echo Please install the missing prerequisites:
    echo   • Docker Desktop: https://www.docker.com/products/docker-desktop
    echo   • Python 3.10+: https://www.python.org/downloads/
    echo   • Node.js 18+: https://nodejs.org/
    echo   • Poetry: pip install poetry
    pause
    exit /b 1
)

echo ✅ All prerequisites found!

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

echo ✅ Docker is running!

if "%SKIP_INSTALL%"=="false" (
    REM Install Python dependencies
    echo 📦 Installing Python dependencies...
    poetry config virtualenvs.in-project true
    poetry install
    if errorlevel 1 (
        echo ❌ Failed to install Python dependencies
        pause
        exit /b 1
    )
    echo ✅ Python dependencies installed!
    
    REM Install UI dependencies
    echo 📦 Installing UI dependencies...
    cd twingraph-ui
    npm install --silent
    if errorlevel 1 (
        echo ⚠️  Normal npm install failed, trying with --legacy-peer-deps...
        npm install --legacy-peer-deps --silent
        if errorlevel 1 (
            echo ❌ Failed to install UI dependencies
            cd ..
            pause
            exit /b 1
        )
    )
    cd ..
    echo ✅ UI dependencies installed!
)

REM Clean up any existing containers and services
echo 🧹 Cleaning up existing containers and services...

REM Stop and remove existing containers
for %%c in (redis gremlin-server twingraph tinkergraph-server tinkergraph-viz rabbitmq redis-stack) do (
    docker ps -a --filter "name=%%c" -q | findstr . >nul
    if not errorlevel 1 (
        echo    Stopping and removing %%c...
        docker stop %%c >nul 2>&1
        docker rm %%c >nul 2>&1
    )
)

REM Stop docker-compose services
docker-compose down --remove-orphans >nul 2>&1

echo ✅ Cleanup completed!

REM Start services
echo 🚀 Starting TwinGraph services...

REM Start Docker Compose services
echo    Starting Docker services...
docker-compose up -d >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to start Docker services
    echo    Trying fallback: starting individual containers...
    
    REM Fallback: Start individual containers
    echo    Starting Redis container...
    docker run --name redis -d -p 6379:6379 redis:alpine >nul
    
    echo    Starting Gremlin server...
    docker run --name gremlin-server -d -p 8182:8182 tinkerpop/gremlin-server:3.7.2 >nul
    
    echo    Starting Graph Visualizer...
    docker run --name gremlin-viz -d -p 3000:3000 prabushitha/gremlin-visualizer:latest >nul
)

echo ✅ Docker services started!

REM Wait for services to be ready
echo ⏳ Waiting for services to initialize...
timeout /t 5 /nobreak >nul

echo    Starting API server...
start /b poetry run python -m twingraph.api.main

echo    Starting UI development server...
cd twingraph-ui
start /b npm run dev
cd ..

echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo 🎉 TwinGraph is starting up!
echo ============================================
echo 📊 Web UI:              http://localhost:4000
echo 🔧 API Server:          http://localhost:8000
echo 📚 API Documentation:   http://localhost:8000/docs
echo 📈 Graph Visualizer:    http://localhost:3000
echo 🔗 Redis:               localhost:6379
echo 🌐 Gremlin Server:      ws://localhost:8182/gremlin
echo ============================================
echo.
echo Press any key to stop all services...
pause >nul

echo 🛑 Stopping TwinGraph services...
docker-compose down >nul
echo ✅ All services stopped!

REM Note: Background processes (API and UI) will continue running
REM Use Task Manager to stop them if needed