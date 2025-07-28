# TwinGraph Windows Startup Script
# This script handles all prerequisites and starts all TwinGraph services
# Usage: .\Start-TwinGraph.ps1 [-SkipInstall] [-DevMode]

param(
    [switch]$SkipInstall,
    [switch]$DevMode
)

Write-Host "🚀 TwinGraph Container Orchestration Engine - Windows Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Function to check if command exists
function Test-Command {
    param($CommandName)
    try {
        Get-Command $CommandName -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Function to check if port is available
function Test-Port {
    param($Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

$missingPrereqs = @()

if (-not (Test-Command "docker")) {
    $missingPrereqs += "Docker Desktop"
}

if (-not (Test-Command "python")) {
    $missingPrereqs += "Python 3.10+"
} else {
    # Check Python version
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python (\d+)\.(\d+)") {
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 10)) {
            $missingPrereqs += "Python 3.10+ (found $pythonVersion)"
        }
    }
}

if (-not (Test-Command "node")) {
    $missingPrereqs += "Node.js 18+"
} else {
    # Check Node version
    $nodeVersion = node --version 2>&1
    if ($nodeVersion -match "v(\d+)\.") {
        $major = [int]$matches[1]
        if ($major -lt 18) {
            $missingPrereqs += "Node.js 18+ (found $nodeVersion)"
        }
    }
}

if (-not (Test-Command "poetry")) {
    Write-Host "Poetry not found, attempting to install..." -ForegroundColor Yellow
    try {
        pip install poetry
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Poetry installed successfully!" -ForegroundColor Green
        } else {
            $missingPrereqs += "Poetry (pip install failed)"
        }
    } catch {
        $missingPrereqs += "Poetry"
    }
}

if ($missingPrereqs.Count -gt 0) {
    Write-Host "❌ Missing prerequisites:" -ForegroundColor Red
    foreach ($prereq in $missingPrereqs) {
        Write-Host "   - $prereq" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please install the missing prerequisites:" -ForegroundColor Yellow
    Write-Host "  • Docker Desktop: https://www.docker.com/products/docker-desktop"
    Write-Host "  • Python 3.10+: https://www.python.org/downloads/"
    Write-Host "  • Node.js 18+: https://nodejs.org/"
    Write-Host "  • Poetry: pip install poetry"
    exit 1
}

Write-Host "✅ All prerequisites found!" -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is running!" -ForegroundColor Green

if (-not $SkipInstall) {
    # Install Python dependencies
    Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
    
    # Configure Poetry to use in-project virtual environment
    poetry config virtualenvs.in-project true
    
    # Install dependencies
    poetry install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Python dependencies" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Python dependencies installed!" -ForegroundColor Green
    
    # Install UI dependencies
    Write-Host "📦 Installing UI dependencies..." -ForegroundColor Yellow
    Set-Location "twingraph-ui"
    
    # Try normal install first, fallback to legacy peer deps
    npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Normal npm install failed, trying with --legacy-peer-deps..." -ForegroundColor Yellow
        npm install --legacy-peer-deps --silent
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install UI dependencies" -ForegroundColor Red
            Set-Location ".."
            exit 1
        }
    }
    
    Set-Location ".."
    Write-Host "✅ UI dependencies installed!" -ForegroundColor Green
}

# Clean up any existing containers and services
Write-Host "🧹 Cleaning up existing containers and services..." -ForegroundColor Yellow

# Stop and remove existing containers
$containersToClean = @("redis", "gremlin-server", "twingraph", "tinkergraph-server", "tinkergraph-viz", "rabbitmq", "redis-stack")
foreach ($container in $containersToClean) {
    $existing = docker ps -a --filter "name=$container" -q
    if ($existing) {
        Write-Host "   Stopping and removing $container..." -ForegroundColor Gray
        docker stop $container | Out-Null
        docker rm $container | Out-Null
    }
}

# Stop docker-compose services
docker-compose down --remove-orphans | Out-Null

Write-Host "✅ Cleanup completed!" -ForegroundColor Green

# Start services
Write-Host "🚀 Starting TwinGraph services..." -ForegroundColor Yellow

# Start Docker Compose services (includes Redis, Gremlin, and other services)
Write-Host "   Starting Docker services..." -ForegroundColor Gray
docker-compose up -d | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker services" -ForegroundColor Red
    Write-Host "   Trying fallback: starting individual containers..." -ForegroundColor Yellow
    
    # Fallback: Start individual containers if docker-compose fails
    Write-Host "   Starting Redis container..." -ForegroundColor Gray
    docker run --name redis -d -p 6379:6379 redis:alpine | Out-Null
    
    Write-Host "   Starting Gremlin server..." -ForegroundColor Gray
    docker run --name gremlin-server -d -p 8182:8182 tinkerpop/gremlin-server:3.7.2 | Out-Null
    
    Write-Host "   Starting Graph Visualizer..." -ForegroundColor Gray
    docker run --name gremlin-viz -d -p 3000:3000 prabushitha/gremlin-visualizer:latest | Out-Null
}

Write-Host "✅ Docker services started!" -ForegroundColor Green

# Wait for services to be ready
Write-Host "⏳ Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start API server in background
Write-Host "   Starting API server..." -ForegroundColor Gray
$apiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    poetry run python -m twingraph.api.main
}

# Wait a moment for API to start
Start-Sleep -Seconds 3

# Start UI development server
Write-Host "   Starting UI development server..." -ForegroundColor Gray
$uiJob = Start-Job -ScriptBlock {
    Set-Location "$using:PWD\twingraph-ui"
    npm run dev
}

# Wait for services to start
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Display service URLs
Write-Host ""
Write-Host "🎉 TwinGraph is starting up!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "📊 Web UI:              http://localhost:4000" -ForegroundColor Cyan
Write-Host "🔧 API Server:          http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 API Documentation:   http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "📈 Graph Visualizer:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔗 Redis:               localhost:6379" -ForegroundColor Cyan
Write-Host "🌐 Gremlin Server:      ws://localhost:8182/gremlin" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green

# Function to cleanup on exit
function Stop-TwinGraph {
    Write-Host ""
    Write-Host "🛑 Stopping TwinGraph services..." -ForegroundColor Yellow
    
    # Stop background jobs
    if ($apiJob) { 
        Stop-Job -Id $apiJob.Id -ErrorAction SilentlyContinue
        Remove-Job -Id $apiJob.Id -ErrorAction SilentlyContinue
    }
    if ($uiJob) { 
        Stop-Job -Id $uiJob.Id -ErrorAction SilentlyContinue
        Remove-Job -Id $uiJob.Id -ErrorAction SilentlyContinue
    }
    
    # Stop Docker services
    docker-compose down | Out-Null
    
    Write-Host "✅ All services stopped!" -ForegroundColor Green
}

if ($DevMode) {
    Write-Host ""
    Write-Host "🔧 Development Mode - Services running in background jobs" -ForegroundColor Yellow
    Write-Host "Job IDs: API=$($apiJob.Id), UI=$($uiJob.Id)" -ForegroundColor Gray
    Write-Host "To stop services manually:" -ForegroundColor Gray
    Write-Host "  Stop-Job -Id $($apiJob.Id),$($uiJob.Id); docker-compose down" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Yellow
    
    # Register cleanup on Ctrl+C
    Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-TwinGraph }
    
    try {
        # Monitor jobs and keep script running
        while ($true) {
            # Check if jobs are still running
            if ($apiJob.State -eq 'Failed') {
                Write-Host "❌ API server failed. Check logs:" -ForegroundColor Red
                Receive-Job -Job $apiJob
                break
            }
            if ($uiJob.State -eq 'Failed') {
                Write-Host "❌ UI server failed. Check logs:" -ForegroundColor Red
                Receive-Job -Job $uiJob
                break
            }
            
            Start-Sleep -Seconds 5
        }
    } finally {
        Stop-TwinGraph
    }
}