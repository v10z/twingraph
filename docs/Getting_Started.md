# Getting Started with TwinGraph

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Your First Workflow](#your-first-workflow)
- [Understanding Core Concepts](#understanding-core-concepts)
- [Platform Setup](#platform-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10, macOS 10.15, Ubuntu 20.04 | Latest stable versions |
| RAM | 4GB | 16GB+ |
| CPU | 2 cores | 8+ cores |
| Disk Space | 10GB | 50GB+ SSD |
| Python | 3.8 | 3.9-3.11 |
| Node.js | 18.0 | 20.0+ |
| Docker | 20.10 | Latest stable |

### Required Software

1. **Docker Desktop**
   ```bash
   # Verify installation
   docker --version
   docker compose version
   ```

2. **Python with Poetry**
   ```bash
   # Install Poetry
   curl -sSL https://install.python-poetry.org | python3 -
   
   # Verify installation
   poetry --version
   ```

3. **Node.js and npm**
   ```bash
   # Verify installation
   node --version
   npm --version
   ```

4. **Git**
   ```bash
   # Verify installation
   git --version
   ```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/aws-samples/twingraph.git
cd twingraph
```

### 2. Platform-Specific Setup

#### 🐧 Linux (Ubuntu/Debian)

```bash
# Update package manager
sudo apt update

# Install system dependencies
sudo apt install -y python3-pip python3-dev build-essential redis-server

# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Add Poetry to PATH (add to ~/.bashrc for permanent)
export PATH="$HOME/.local/bin:$PATH"

# Install dependencies
make install

# Start Docker containers
make docker_containers_poetry
```

#### 🐧 Linux (RHEL/CentOS/Amazon Linux)

```bash
# Install system dependencies
sudo yum install -y python3-pip python3-devel gcc redis

# For Amazon Linux 2, use extras
sudo amazon-linux-extras install redis6

# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Add Poetry to PATH
export PATH="$HOME/.local/bin:$PATH"

# Install dependencies
make install

# Start services
sudo systemctl start redis
make docker_containers_poetry
```

#### 🍎 macOS

```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install python@3.9 redis poetry

# Start Redis
brew services start redis

# Install Python dependencies
poetry install

# Start Docker containers
docker compose up -d
```

#### 🪟 Windows

**Option 1: Windows with WSL2 (Recommended)**

1. Install WSL2:
```powershell
# Run as Administrator
wsl --install -d Ubuntu
```

2. Inside WSL2 Ubuntu:
```bash
# Follow Linux (Ubuntu) instructions above
```

**Option 2: Native Windows**

1. Install prerequisites:
   - [Python 3.9+](https://www.python.org/downloads/) (check "Add to PATH")
   - [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
   - [Git for Windows](https://git-scm.com/download/win)

2. Install Poetry (PowerShell as Administrator):
```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
```

3. Add Poetry to PATH:
```powershell
# Add to System PATH
$env:Path += ";$env:APPDATA\Python\Scripts"

# Verify installation
poetry --version
```

4. Install Redis (using Docker):
```powershell
docker run --name redis -d -p 6379:6379 redis:alpine
```

5. Install TwinGraph dependencies:
```powershell
# In the twingraph directory
poetry install

# Start other containers
docker compose up -d
```

### 3. Configure Environment

Create a `.env` file in the project root:

```bash
# Graph Database
GRAPH_ENDPOINT=ws://localhost:8182

# Redis Configuration
REDIS_BACKEND=redis://localhost:6379/0
REDIS_BROKER=redis://localhost:6379/1

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# UI Configuration
UI_PORT=4000

# Optional: Cloud Credentials
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
# AWS_REGION=us-east-1
```

### 4. Start TwinGraph

#### Linux/macOS
```bash
# Make script executable (first time only)
chmod +x start_twingraph.sh

# Start all services
./start_twingraph.sh
```

#### Windows (Native)
```powershell
# Start all services
.\start_twingraph.bat

# Or if using PowerShell script
.\Start-TwinGraph.ps1
```

#### Windows (WSL2)
```bash
# Inside WSL2
./start_twingraph.sh
```

### 5. Verify Installation

Open your browser and check:
- **Web UI**: http://localhost:4000
- **API Health**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs

You should see:
- Web UI: TwinGraph dashboard
- API Health: `{"status": "healthy", "version": "2.0.0"}`
- API Docs: Interactive Swagger documentation

## Quick Start

### Hello World Component

Create a file `hello_world.py`:

```python
from twingraph import component, pipeline
from typing import NamedTuple
from collections import namedtuple

@component()
def hello_world(name: str = "World") -> NamedTuple:
    """Simple hello world component."""
    Output = namedtuple('Output', ['message'])
    message = f"Hello, {name}!"
    print(message)
    return Output(message=message)

@pipeline()
def hello_pipeline():
    """Simple hello world pipeline."""
    result = hello_world(name="TwinGraph")
    print(f"Pipeline result: {result['outputs']['message']}")
    return result

if __name__ == "__main__":
    # Execute the pipeline
    hello_pipeline()
```

Run it:
```bash
python hello_world.py
```

Expected output:
```
Hello, TwinGraph!
Pipeline result: Hello, TwinGraph!
```

## Your First Workflow

### 1. Using the Visual Designer

1. Open http://localhost:4000
2. Click "New Workflow"
3. Drag components from the sidebar:
   - "File Reader" - to load data
   - "Data Transform" - to process data
   - "File Writer" - to save results
4. Connect components by dragging between ports
5. Configure each component by double-clicking
6. Click "Run" to execute

### 2. Using Code

Create `data_pipeline.py`:

```python
from twingraph import component, pipeline
from typing import NamedTuple
from collections import namedtuple
import pandas as pd

@component(platform='docker', docker_image='python:3.9-slim')
def load_csv(file_path: str) -> NamedTuple:
    """Load data from CSV file."""
    Output = namedtuple('Output', ['data', 'row_count'])
    
    # Read CSV
    df = pd.read_csv(file_path)
    row_count = len(df)
    
    # Convert to dict for serialization
    data = df.to_dict('records')
    
    return Output(data=data, row_count=row_count)

@component(platform='docker', docker_image='python:3.9-slim')
def filter_data(data: list, threshold: float = 0.5) -> NamedTuple:
    """Filter data based on threshold."""
    Output = namedtuple('Output', ['filtered_data', 'filtered_count'])
    
    # Filter records
    filtered = [record for record in data if record.get('value', 0) > threshold]
    
    return Output(filtered_data=filtered, filtered_count=len(filtered))

@component()
def save_results(data: list, output_path: str) -> NamedTuple:
    """Save results to file."""
    Output = namedtuple('Output', ['success', 'path'])
    
    # Convert back to DataFrame and save
    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    
    return Output(success=True, path=output_path)

@pipeline()
def data_processing_pipeline():
    """Complete data processing pipeline."""
    # Load data
    raw_data = load_csv(file_path='input_data.csv')
    print(f"Loaded {raw_data['outputs']['row_count']} records")
    
    # Filter data
    filtered = filter_data(
        data=raw_data['outputs']['data'],
        threshold=0.7,
        parent_hash=raw_data['hash']
    )
    print(f"Filtered to {filtered['outputs']['filtered_count']} records")
    
    # Save results
    result = save_results(
        data=filtered['outputs']['filtered_data'],
        output_path='filtered_output.csv',
        parent_hash=filtered['hash']
    )
    
    return result

if __name__ == "__main__":
    # Create sample data
    import pandas as pd
    sample_data = pd.DataFrame({
        'id': range(10),
        'value': [0.1, 0.8, 0.3, 0.9, 0.4, 0.7, 0.2, 0.85, 0.6, 0.95]
    })
    sample_data.to_csv('input_data.csv', index=False)
    
    # Run pipeline
    result = data_processing_pipeline()
    print(f"Pipeline completed: {result['outputs']['path']}")
```

## Understanding Core Concepts

### Components

Components are the building blocks of workflows:
- **Input**: Typed parameters with optional defaults
- **Processing**: Your business logic
- **Output**: NamedTuple with results
- **Platform**: Where to execute (local, docker, cloud)

### Pipelines

Pipelines orchestrate component execution:
- **Define Flow**: Chain components together
- **Pass Data**: Use outputs from one component as inputs to another
- **Track Lineage**: Automatic graph tracing with parent hashes

### Execution Platforms

Choose where components run:

| Platform | Use Case | Startup Time | Max Duration |
|----------|----------|--------------|--------------|
| Local | Development | Instant | Unlimited |
| Docker | Isolated environments | 1-5s | Unlimited |
| Kubernetes | Production workloads | 10-30s | Unlimited |
| Lambda | Serverless, event-driven | 0-1s | 15 min |
| Batch | Heavy computation | 30-60s | Unlimited |

### Graph Tracing

Every execution is tracked:
- **Nodes**: Component executions with metadata
- **Edges**: Data flow between components
- **Properties**: Inputs, outputs, timing, resources

## Platform Setup

### Docker Components

```python
@component(
    platform='docker',
    docker_image='pytorch/pytorch:latest',
    config={
        'memory': '4G',
        'cpu': '2.0',
        'volumes': {'/local/data': '/container/data'}
    }
)
def train_model(data_path: str) -> NamedTuple:
    # Training logic here
    pass
```

### Kubernetes Deployment

1. Configure kubectl:
```bash
kubectl config current-context
```

2. Create component:
```python
@component(
    platform='kubernetes',
    docker_image='myregistry/myimage:latest',
    config={
        'namespace': 'twingraph',
        'resources': {
            'requests': {'cpu': '1', 'memory': '2Gi'},
            'limits': {'cpu': '4', 'memory': '8Gi'}
        }
    }
)
def k8s_component(data: dict) -> NamedTuple:
    # Kubernetes execution
    pass
```

### AWS Lambda Setup

1. Configure AWS credentials:
```bash
aws configure
```

2. Create Lambda component:
```python
@component(
    platform='lambda',
    config={
        'function_name': 'twingraph-processor',
        'runtime': 'python3.9',
        'memory_size': 3008,
        'timeout': 300,
        'role': 'arn:aws:iam::123456789:role/lambda-role'
    }
)
def serverless_component(event: dict) -> NamedTuple:
    # Lambda logic here
    pass
```

### AWS Batch Setup

1. Create compute environment and job queue in AWS Console

2. Configure component:
```python
@component(
    platform='batch',
    docker_image='123456789.dkr.ecr.region.amazonaws.com/myimage',
    config={
        'job_definition': 'twingraph-job-def',
        'job_queue': 'twingraph-queue',
        'vcpus': 4,
        'memory': 8192
    }
)
def batch_job(data_path: str) -> NamedTuple:
    # Batch processing logic
    pass
```

## Troubleshooting

### Common Issues

#### 1. Docker Connection Error

**Linux Error:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Linux Solution:**
```bash
# Start Docker service
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker ps
```

**Windows Error:**
```
error during connect: This error may indicate that the docker daemon is not running
```

**Windows Solution:**
1. Start Docker Desktop from Start Menu
2. Wait for "Docker Desktop is running" notification
3. If using WSL2, ensure integration is enabled:
   - Docker Desktop → Settings → Resources → WSL Integration
   - Enable for your distro

#### 2. Port Already in Use

**Linux/macOS:**
```bash
# Find process using port
sudo lsof -i :8000
# or
sudo ss -tlnp | grep 8000

# Kill process (replace PID)
kill -9 <PID>
```

**Windows (PowerShell):**
```powershell
# Find process using port
netstat -ano | findstr :8000

# Kill process (replace PID)
taskkill /F /PID <PID>

# Or change port in .env
$env:API_PORT = "8001"
```

#### 3. Poetry Not Found

**Linux/macOS:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"

# Reload shell
source ~/.bashrc
```

**Windows:**
```powershell
# Add to System PATH permanently
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:APPDATA\Python\Scripts", [EnvironmentVariableTarget]::User)

# Restart PowerShell
```

#### 4. Redis Connection Failed

**Linux:**
```bash
# Check Redis status
systemctl status redis

# Start Redis
sudo systemctl start redis

# Enable on boot
sudo systemctl enable redis
```

**Windows (Docker):**
```powershell
# Check if Redis container is running
docker ps | Select-String redis

# Start Redis container
docker run --name redis -d -p 6379:6379 redis:alpine

# Test connection
docker exec -it redis redis-cli ping
```

#### 5. Permission Denied (Linux/macOS)

```bash
# Make scripts executable
chmod +x start_twingraph.sh
chmod +x scripts/*.sh

# If poetry install fails
sudo chown -R $USER:$USER ~/.cache/pypoetry
```

#### 6. Windows Path Length Limit

**Error:** "The filename or extension is too long"

**Solution:**
1. Enable long path support:
```powershell
# Run as Administrator
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```
2. Clone to a shorter path (e.g., `C:\tw\`)

#### 7. WSL2 Network Issues

**Problem:** Can't access localhost services from Windows

**Solution:**
```bash
# In WSL2, use Windows host IP
export WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')

# Access services via
# http://$WINDOWS_HOST:8000
```

#### 8. Node/npm Issues

**Linux/macOS:**
```bash
# Use Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**Windows:**
```powershell
# Use nvm-windows
# Download from: https://github.com/coreybutler/nvm-windows

nvm install 18.0.0
nvm use 18.0.0
```

### Debugging Tips

1. **Enable Debug Logging**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

2. **Check Component Logs**
```bash
# Local execution
tail -f logs/twingraph.log

# Docker execution
docker logs <container-id>

# Kubernetes execution
kubectl logs <pod-name> -n twingraph
```

3. **Validate Workflow**
```python
from twingraph import validate_workflow

errors = validate_workflow(my_pipeline)
if errors:
    print("Workflow validation errors:", errors)
```

### Getting Help

1. **Documentation**: Check `/docs` folder
2. **API Reference**: http://localhost:8000/docs
3. **GitHub Issues**: [Report bugs](https://github.com/aws-samples/twingraph/issues)
4. **Examples**: See `/examples` folder for working code

## Next Steps

1. **Explore Examples**: Review the demo workflows in `/examples`
2. **Build Components**: Create custom components for your use case
3. **Deploy to Cloud**: Set up Kubernetes or AWS for production
4. **Monitor Workflows**: Use the graph visualization for debugging
5. **Optimize Performance**: Profile and tune your pipelines

### Recommended Learning Path

1. ✅ Complete this Getting Started guide
2. 📖 Read [API Reference](./API_Reference.md)
3. 🔧 Try examples in order:
   - `demo_1_graph_tracing` - Understand graph visualization
   - `demo_2_container_components` - Learn Docker integration
   - `demo_3_diverse_components` - Explore component variety
   - `demo_4_celery_backend` - Scale with distributed execution
4. 🚀 Build your own workflow
5. 📊 Deploy to production

## FAQ

**Q: Can I use TwinGraph without Docker?**
A: Yes, use `platform='local'` for components, but you lose isolation and reproducibility.

**Q: How do I share data between components?**
A: Components pass data through return values. For large data, use file references.

**Q: Can I use GPUs?**
A: Yes, configure GPU support in Docker/Kubernetes. See platform-specific documentation.

**Q: Is TwinGraph suitable for real-time processing?**
A: TwinGraph is optimized for batch workflows. For real-time, consider streaming integrations.

**Q: How do I monitor production workflows?**
A: Use the built-in graph visualization, structured logs, and metrics API.

Remember: Start simple, test locally, then scale to the cloud!