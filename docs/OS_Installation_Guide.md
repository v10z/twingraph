# OS-Specific Installation Guide

This guide provides detailed installation instructions for each operating system.

## Table of Contents
- [Windows Installation](#windows-installation)
- [Linux Installation](#linux-installation)
- [macOS Installation](#macos-installation)
- [Docker Desktop Setup](#docker-desktop-setup)
- [Verification Steps](#verification-steps)

## Windows Installation

### Option 1: Windows with WSL2 (Recommended)

WSL2 provides the best compatibility and performance for TwinGraph on Windows.

#### Step 1: Install WSL2

1. **Enable WSL2** (PowerShell as Administrator):
```powershell
# Enable WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Enable Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart your computer
```

2. **Install WSL2 and Ubuntu**:
```powershell
# Set WSL2 as default
wsl --set-default-version 2

# Install Ubuntu
wsl --install -d Ubuntu-22.04

# Launch Ubuntu and create user account
wsl -d Ubuntu-22.04
```

3. **Inside WSL2 Ubuntu**, follow the [Linux Installation](#linux-installation) instructions

#### Step 2: Configure WSL2 Networking

Create or edit `~/.wslconfig` in Windows:
```ini
[wsl2]
memory=8GB
processors=4
localhostForwarding=true
```

### Option 2: Native Windows Installation

#### Prerequisites

1. **Install Python 3.9+**:
   - Download from [python.org](https://www.python.org/downloads/)
   - **Important**: Check "Add Python to PATH"
   - Verify: `python --version`

2. **Install Git**:
   - Download from [git-scm.com](https://git-scm.com/download/win)
   - Use default settings
   - Verify: `git --version`

3. **Install Docker Desktop**:
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - Enable WSL2 backend during installation
   - Start Docker Desktop
   - Verify: `docker --version`

#### Installation Steps

1. **Clone Repository** (PowerShell):
```powershell
cd C:\
git clone https://github.com/aws-samples/twingraph.git
cd twingraph
```

2. **Install Poetry**:
```powershell
# Install Poetry
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -

# Add to PATH (restart PowerShell after)
$env:Path += ";$env:APPDATA\Python\Scripts"
[Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::User)
```

3. **Install Dependencies**:
```powershell
# Install Python packages
poetry install

# Start Redis container
docker run --name redis -d -p 6379:6379 redis:alpine

# Start Gremlin container  
docker run --name gremlin-server -d -p 8182:8182 tinkerpop/gremlin-server:3.6.1

# Start other services
docker compose up -d
```

4. **Start TwinGraph**:
```powershell
# Option 1: Batch file
.\start_twingraph.bat

# Option 2: PowerShell script
.\Start-TwinGraph.ps1
```

### Windows-Specific Considerations

1. **Long Path Support**:
```powershell
# Enable if you get path length errors
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
    -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

2. **Firewall Configuration**:
   - Allow Docker Desktop through Windows Firewall
   - Allow ports: 4000, 8000, 8182, 6379, 3000

3. **Antivirus Exclusions**:
   - Add Docker Desktop folders to exclusions
   - Add project folder to exclusions for better performance

## Linux Installation

### Ubuntu/Debian

#### Step 1: System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install build tools
sudo apt install -y \
    build-essential \
    curl \
    git \
    python3-pip \
    python3-dev \
    python3-venv \
    redis-server \
    ca-certificates \
    gnupg \
    lsb-release
```

#### Step 2: Install Docker

```bash
# Add Docker's official GPG key
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### Step 3: Install Poetry

```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Add to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
poetry --version
```

#### Step 4: Install TwinGraph

```bash
# Clone repository
git clone https://github.com/aws-samples/twingraph.git
cd twingraph

# Install dependencies
make install

# Start services
make docker_containers_poetry

# Start TwinGraph
./start_twingraph.sh
```

### RHEL/CentOS/Fedora

#### Step 1: System Dependencies

```bash
# For RHEL/CentOS 8+
sudo dnf install -y \
    gcc \
    gcc-c++ \
    make \
    python3-devel \
    python3-pip \
    redis \
    git

# For older versions (CentOS 7)
sudo yum install -y \
    gcc \
    gcc-c++ \
    make \
    python3-devel \
    python3-pip \
    redis \
    git
```

#### Step 2: Install Docker

```bash
# Install Docker
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### Step 3: Continue with Poetry and TwinGraph installation as shown above

### Amazon Linux 2

```bash
# Install extras
sudo amazon-linux-extras install docker redis6 python3.8

# Start services
sudo systemctl start docker redis
sudo systemctl enable docker redis

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Poetry and continue as above
```

## macOS Installation

### Step 1: Install Homebrew

```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add to PATH (for Apple Silicon Macs)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### Step 2: Install Dependencies

```bash
# Install required packages
brew install python@3.9 redis git poetry

# Start Redis
brew services start redis
```

### Step 3: Install Docker Desktop

1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Install and start Docker Desktop
3. Verify: `docker --version`

### Step 4: Install TwinGraph

```bash
# Clone repository
git clone https://github.com/aws-samples/twingraph.git
cd twingraph

# Install Python dependencies
poetry install

# Start Docker containers
docker compose up -d

# Start TwinGraph
./start_twingraph.sh
```

### macOS-Specific Considerations

1. **Apple Silicon (M1/M2) Compatibility**:
   - Use `platform: linux/amd64` in docker-compose.yml if needed
   - Some Python packages may need Rosetta 2

2. **File Permissions**:
```bash
# Fix permission issues
chmod +x start_twingraph.sh
chmod -R 755 ./scripts
```

## Docker Desktop Setup

### Windows Docker Desktop

1. **Settings Configuration**:
   - General → Use WSL 2 based engine ✓
   - Resources → WSL Integration → Enable for your distro
   - Resources → Advanced → Allocate at least 4GB RAM

2. **File Sharing**:
   - Resources → File Sharing → Add project directory

### macOS Docker Desktop

1. **Settings Configuration**:
   - Resources → Advanced → Allocate at least 4GB RAM
   - Features → Use Virtualization Framework ✓

2. **Performance**:
   - Enable VirtioFS for better file performance

### Linux Docker Setup

```bash
# Configure Docker to start on boot
sudo systemctl enable docker

# Configure Docker daemon
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
EOF

sudo systemctl restart docker
```

## Verification Steps

### 1. Check All Services

```bash
# Check Docker
docker --version
docker ps

# Check Python
python --version
poetry --version

# Check Node.js (if installing UI)
node --version
npm --version

# Check Redis
redis-cli ping  # Should return PONG
```

### 2. Test Containers

```bash
# Test Gremlin
curl -X POST http://localhost:8182 -d '{"gremlin": "g.V().count()"}'

# Test Redis
docker exec -it redis redis-cli ping
```

### 3. Verify TwinGraph Installation

```python
# Test Python import
python -c "import twingraph; print('TwinGraph imported successfully')"
```

### 4. Check Service Health

```bash
# API Health
curl http://localhost:8000/health

# Should return:
# {"status": "healthy", "version": "2.0.0"}
```

## Troubleshooting by OS

### Windows Issues

1. **Hyper-V not enabled**:
   - Enable in Windows Features
   - Requires Windows Pro/Enterprise

2. **Docker Desktop won't start**:
   - Check virtualization in BIOS
   - Reinstall with WSL2 backend

### Linux Issues

1. **Permission denied**:
```bash
# Fix Docker permissions
sudo chmod 666 /var/run/docker.sock

# Fix file permissions
sudo chown -R $USER:$USER ~/.cache
```

2. **SELinux issues (RHEL/CentOS)**:
```bash
# Temporary disable for testing
sudo setenforce 0

# Or configure properly
sudo setsebool -P container_manage_cgroup on
```

### macOS Issues

1. **Port already in use**:
```bash
# Find and kill process
sudo lsof -i :8000
kill -9 <PID>
```

2. **Docker Desktop resources**:
   - Increase memory allocation in preferences
   - Restart Docker Desktop

## Support Matrix

| OS | Version | Python | Docker | Status |
|----|---------|---------|---------|---------|
| Windows 11 | 22H2+ | 3.9-3.11 | Desktop 4.x | ✅ Supported |
| Windows 10 | 20H2+ | 3.9-3.11 | Desktop 4.x | ✅ Supported |
| Ubuntu | 20.04, 22.04 | 3.8-3.11 | CE 20.10+ | ✅ Supported |
| RHEL/CentOS | 8, 9 | 3.8-3.11 | CE 20.10+ | ✅ Supported |
| Amazon Linux | 2 | 3.8-3.11 | CE 20.10+ | ✅ Supported |
| macOS | 12+ (Intel/M1) | 3.9-3.11 | Desktop 4.x | ✅ Supported |

## Next Steps

After successful installation:
1. Follow the [Getting Started Guide](Getting_Started.md)
2. Try the example workflows
3. Build your first component
4. Explore the [API Reference](API_Reference.md)