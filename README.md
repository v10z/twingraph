# <img src="docs/figures/icon.svg#gh-light-mode-only" media="(prefers-color-scheme: light)" width=20><img src="docs/figures/icon.svg#gh-dark-mode-only" media="(prefers-color-scheme: dark)" width=20> TwinGraph: Container Orchestration Engine

**TwinGraph** is a container orchestration engine designed for building and managing GenAI workflows at scale. It provides visual workflow design capabilities combined with multi-language execution support, enabling seamless orchestration across diverse infrastructure platforms.

## 📋 Motivation

<img src="docs/figures/Challenges.png" alt="Orchestration Challenges" width="600">

TwinGraph addresses key challenges in modern workflow orchestration:
- **Platform Fragmentation**: Unified interface for Docker, Kubernetes, Lambda, and Batch
- **Language Lock-in**: Support for polyglot development across Python, JavaScript, Rust, and more
- **Observability Gaps**: Complete execution tracking with graph-based lineage
- **Scaling Complexity**: Automatic resource management and distributed execution

## 📚 Quick Links

| [🚀 Getting Started](docs/Getting_Started.md) | [📖 API Reference](docs/API_Reference.md) | [🏗️ Architecture](docs/Architecture.md) | [⚠️ Known Limitations](docs/Known_Limitations.md) |
|:---:|:---:|:---:|:---:|
| Installation & First Steps | Complete API Documentation | System Design | Constraints & Workarounds |

## 🚀 Key Features

### Visual Workflow Design

TwinGraph features a web-based drag-and-drop interface for workflow composition. The platform provides real-time execution visualization with node-level status monitoring. Components can be inspected during runtime to view properties, logs, and intermediate outputs, facilitating efficient debugging and monitoring.

### Multi-Language Support

The platform supports polyglot development with native execution environments for Python, JavaScript, TypeScript, Bash, C++, and Rust. Code editing is handled through an integrated Monaco editor instance, providing syntax highlighting, IntelliSense, and other IDE features within the browser environment.

### Platform-Agnostic Execution

TwinGraph abstracts infrastructure complexity through a unified execution model that supports:
- Local Docker containers
- Kubernetes clusters  
- AWS Lambda functions
- AWS Batch compute environments

The orchestration engine handles container lifecycle management, retry logic with exponential backoff, and distributed task execution via Celery workers.

### GenAI Integration

The platform includes pre-built components for GenAI workflows:
- LLM integration adapters for major providers (OpenAI, Anthropic, open-source models)
- Vector database connectors for embedding storage and retrieval
- RAG (Retrieval-Augmented Generation) pipeline templates
- Multi-agent orchestration primitives

### Enterprise Features

- **Observability**: Full execution tracking via graph database (TinkerGraph/Neptune)
- **Structured Logging**: JSON-formatted logs with contextual metadata
- **Performance Metrics**: Component-level execution time and resource utilization tracking
- **Version Control**: Git integration for workflow versioning and reproducibility

## 🎯 Use Cases

### GenAI Application Development
TwinGraph enables the construction of complex AI pipelines that integrate multiple LLMs, vector databases, and custom processing logic. Common implementations include RAG systems for enterprise knowledge management, multi-agent orchestration systems, and hybrid AI/ML workflows.

### Data Engineering & ETL
The platform supports high-throughput data processing pipelines with built-in fault tolerance. TwinGraph's retry mechanisms and error handling ensure pipeline resilience, while the distributed execution model enables horizontal scaling for large-scale data transformations.

### Machine Learning Operations
TwinGraph facilitates ML model training and deployment workflows, particularly when leveraging AWS Batch for compute-intensive tasks. The platform supports hyperparameter optimization, distributed training, and automated model evaluation pipelines.

### Scientific Computing
Researchers utilize TwinGraph for orchestrating computational simulations and numerical experiments. The platform's ability to manage hundreds of concurrent container instances makes it suitable for Monte Carlo simulations, parameter sweeps, and other embarrassingly parallel workloads.

### DevOps & CI/CD
Development teams implement multi-stage deployment pipelines using TwinGraph's cross-platform execution capabilities. Workflows can seamlessly transition from local testing to staging environments on Kubernetes and production deployments on serverless infrastructure.

## 🏗️ Architecture

### System Overview

<img src="docs/figures/OverallPicture.png" alt="TwinGraph Architecture" width="600">

TwinGraph implements a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│          Web UI (React + TypeScript)         │
├─────────────────────────────────────────────┤
│         FastAPI Backend + WebSocket          │
├─────────────────────────────────────────────┤
│     Orchestration Engine (Python Core)       │
├─────────────────────────────────────────────┤
│  Execution Platforms (Docker/K8s/Lambda)     │
├─────────────────────────────────────────────┤
│   Graph DB (TinkerGraph/Neptune) + Redis    │
└─────────────────────────────────────────────┘
```

### Workflow Execution Model

<img src="docs/figures/Picture3_dark.svg#gh-dark-mode-only" alt="Execution Flow" width="500">
<img src="docs/figures/Picture3.png#gh-light-mode-only" alt="Execution Flow" width="500">

The execution engine processes workflows through the following stages:
1. **Parsing**: Workflow definition parsing and validation
2. **Planning**: Dependency resolution and execution plan generation
3. **Scheduling**: Task distribution across available compute resources
4. **Execution**: Platform-specific component execution
5. **Monitoring**: Real-time status tracking and metric collection

## 🚀 Installation

### Prerequisites

- Docker and Docker Compose
- Python 3.8+ with Poetry
- Node.js 18+ and npm
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/aws-samples/twingraph.git
   cd twingraph
   ```

2. **Install dependencies** (Linux/macOS)
   ```bash
   make install
   make docker_containers_poetry
   ```

3. **Start the platform**
   ```bash
   sh start_twingraph.sh
   ```

### Service Endpoints

Once running, the following services are available:

- **Web UI**: http://localhost:4000 - Visual workflow designer interface
- **API Server**: http://localhost:8000 - REST API for programmatic access
- **API Documentation**: http://localhost:8000/docs - OpenAPI/Swagger documentation
- **Graph Visualizer**: http://localhost:3000 - Real-time execution visualization

## 💻 Creating Workflows

### Visual Method

Access the Web UI at http://localhost:4000 to create workflows using the drag-and-drop interface:

1. Select components from the sidebar palette
2. Place components on the canvas
3. Connect component ports to define data flow
4. Configure component properties via double-click
5. Execute workflows using the toolbar controls
6. Monitor execution through real-time visualization

### Programmatic Method

TwinGraph supports decorator-based workflow definition for code-first development:

```python
from twingraph import component, pipeline
from typing import NamedTuple

@component()
def load_data(source: str) -> NamedTuple:
    """Load data from source"""
    Output = namedtuple('Output', ['data'])
    # Your data loading logic here
    return Output(data=[1, 2, 3, 4, 5])

@component(platform='docker', docker_image='python:3.9')
def process_data(data: list) -> NamedTuple:
    """Process data in Docker container"""
    Output = namedtuple('Output', ['result'])
    result = sum(data) / len(data)
    return Output(result=result)

@pipeline()
def analytics_pipeline():
    # Load data
    raw_data = load_data('database')

    # Process in Docker
    result = process_data(
        raw_data['outputs']['data'],
        parent_hash=raw_data['hash']
    )

    return result

# Execute pipeline
analytics_pipeline()
```

## 🧩 Component Library

TwinGraph provides a comprehensive set of pre-built components organized by functional domain:

### GenAI Components
- **LLM Interface**: Standardized adapters for OpenAI, Anthropic, and Hugging Face models
- **Embedding Generator**: Vector embedding creation with support for multiple providers
- **Vector Store**: Integration with Pinecone, Weaviate, and ChromaDB for similarity search
- **RAG Pipeline**: Complete retrieval-augmented generation workflow components
- **Agent Framework**: Autonomous agent execution with tool use and memory management

### Data Processing
- **File I/O**: Support for CSV, JSON, Parquet, Avro, and other common formats
- **Database Connectors**: Native integration with PostgreSQL, MySQL, MongoDB, and DynamoDB
- **API Integration**: RESTful API client with authentication and rate limiting
- **Stream Processing**: Real-time data ingestion from Kafka, Kinesis, and Redis Streams

### Compute Components
- **Script Execution**: Native runners for Python, JavaScript, and Bash scripts
- **Container Execution**: Docker-based component execution with resource constraints
- **Distributed Map**: Parallel processing across worker pools
- **Batch Processing**: Integration with AWS Batch for large-scale computations

### Control Flow
- **Conditional Branching**: If-then-else logic with complex condition evaluation
- **Iteration**: For-each and while-loop constructs with break conditions
- **Parallel Execution**: Fork-join patterns for concurrent processing
- **Error Handling**: Try-catch-finally blocks with retry policies

## 🔧 Platform Configuration

### Kubernetes Deployment
```python
@component(
    platform='kubernetes',
    docker_image='myregistry/myimage:latest',
    config={
        'namespace': 'twingraph',
        'resources': {
            'cpu': '2000m',
            'memory': '4Gi'
        }
    }
)
def k8s_component(data: dict) -> NamedTuple:
    # Runs on Kubernetes
    pass
```

### AWS Lambda Integration
```python
@component(
    platform='lambda',
    config={
        'function_name': 'my-processor',
        'timeout': 900,
        'memory_size': 3008
    }
)
def serverless_component(event: dict) -> NamedTuple:
    # Runs on AWS Lambda
    pass
```

### AWS Batch Integration
```python
@component(
    platform='batch',
    docker_image='my-registry/compute-job:latest',
    config={
        'job_definition': 'my-compute-job',
        'job_queue': 'high-priority-queue',
        'vcpus': 4,
        'memory': 16384,
        'environment': {
            'COMPUTE_MODE': 'distributed'
        }
    }
)
def batch_compute_job(data: dict) -> NamedTuple:
    # Runs on AWS Batch for heavy compute workloads
    Output = namedtuple('Output', ['results'])
    # Process large datasets, ML training, etc.
    return Output(results=processed_data)
```

## 📊 Monitoring & Debugging

### Real-time Visualization

<img src="docs/figures/Picture8_dark.svg#gh-dark-mode-only" alt="Graph Visualization" width="600">
<img src="docs/figures/Picture8.png#gh-light-mode-only" alt="Graph Visualization" width="600">

TwinGraph provides comprehensive execution monitoring through its graph visualization interface:

- **Node Status Indicators**: Color-coded states (pending, running, success, failure)
- **Execution Flow**: Visual representation of data flow between components
- **Component Inspector**: Click-to-inspect functionality for viewing:
  - Input/output data
  - Execution logs
  - Performance metrics
  - Error traces
- **Auto-refresh**: 1-second polling interval during active executions

### Structured Logging

The platform implements hierarchical structured logging with contextual metadata:

```python
from twingraph.core.logging import get_logger

logger = get_logger(__name__)
logger.log_execution(
    component='my_component',
    execution_id='abc123',
    status='success',
    duration=1.23,
    metadata={'records_processed': 1000}
)
```

Log entries include:
- Execution context (workflow ID, component ID, execution ID)
- Timestamp with microsecond precision
- Performance metrics (duration, memory usage)
- Custom metadata fields

### Performance Analytics

TwinGraph collects and exposes detailed performance metrics:

- **Component Metrics**: Execution time, CPU usage, memory consumption
- **Workflow Analytics**: End-to-end latency, throughput, success rates
- **Platform Comparisons**: Performance across different execution environments
- **Resource Utilization**: Container resource usage and scaling metrics

## 🧪 Testing

Run the comprehensive test suite:

```bash
# All tests with coverage
python run_tests.py --verbose --coverage

# Specific test suites
python run_tests.py --unit
python run_tests.py --integration
python run_tests.py --benchmarks
```

## 🚢 Deployment

### Docker Compose (Development)
```bash
docker compose up -d
```

### Kubernetes (Production)
```bash
kubectl apply -f deploy/kubernetes/
```

### AWS EKS
See `examples/orchestration_demos/demo_5_celery_K8s/` for EKS deployment.

## 📚 Examples

The repository includes comprehensive examples demonstrating various use cases and deployment patterns:

### Existing Examples

| Example | Description | Key Technologies |
|---------|-------------|------------------|
| [Graph Tracing](examples/orchestration_demos/demo_1_graph_tracing) | Workflow execution tracking and visualization using graph database | TinkerGraph, Gremlin |
| [Docker Components](examples/orchestration_demos/demo_2_docker) | Docker-based component execution with custom images | Docker, Python, ECR |
| [Git Data Pipeline](examples/orchestration_demos/demo_3_git_data) | Extract and analyze git repository history | Git, Data Processing |
| [Celery Backend](examples/orchestration_demos/demo_4_celery_backend) | Distributed task execution with Celery | Celery, Redis |
| [Kubernetes Deployment](examples/orchestration_demos/demo_5_celery_K8s) | Production K8s deployment with EKS | EKS, Kubernetes, Celery |
| [AWS Batch](examples/orchestration_demos/demo_6_celery_aws_batch) | Large-scale parallel processing | AWS Batch, Celery |
| [Lambda Functions](examples/orchestration_demos/demo_7_lambda) | Serverless component execution | AWS Lambda, Docker |
| [Multi-Platform](examples/orchestration_demos/demo_8_docker_K8s_lambda_batch) | Cross-platform workflow deployment | Docker, K8s, Lambda, Batch |
| [Neptune DB](examples/orchestration_demos/demo_9_neptunedb) | Graph database integration | AWS Neptune, Gremlin |
| [Multi-Pipeline](examples/orchestration_demos/demo_10_multipipeline) | Run multiple pipelines with unified graph tracking | TinkerGraph, Pipeline Orchestration |
| [GenAI Workflow](examples/orchestration_demos/demo_11_genai_workflow) | GenAI application with LLM integration | LLM, JSON Workflows |

### Additional Examples (To Be Created)

| Example | Description | Key Technologies |
|---------|-------------|------------------|
| [RAG Pipeline](examples/orchestration_demos/demo_12_rag_pipeline) | Complete RAG implementation with vector search | LangChain, Pinecone, OpenAI |
| [Multi-Language](examples/orchestration_demos/demo_13_multi_language) | Polyglot workflows with Python, JS, Rust | Multiple Runtimes |
| [Stream Processing](examples/orchestration_demos/demo_14_streaming) | Real-time data stream processing | Kafka, Redis Streams |
| [ML Training Pipeline](examples/orchestration_demos/demo_15_ml_training) | Distributed ML model training | PyTorch, AWS Batch |
| [ETL Workflow](examples/orchestration_demos/demo_16_etl) | Data transformation pipeline | Pandas, DuckDB, S3 |
| [Error Handling](examples/orchestration_demos/demo_17_error_handling) | Retry logic and fault tolerance | Circuit Breakers |
| [Webhook Integration](examples/orchestration_demos/demo_18_webhooks) | External API integration | REST, GraphQL |
| [Monitoring Pipeline](examples/orchestration_demos/demo_19_monitoring) | Observability and alerting | Prometheus, Grafana |

## 🔌 API Reference

### REST Endpoints
- `GET /api/workflows` - List workflows
- `POST /api/workflows/{id}` - Save workflow
- `POST /api/executions` - Execute workflow
- `GET /api/graph/execution/{id}` - Get execution graph

### WebSocket Events
- `execution:{id}` - Real-time execution updates
- `node:{id}:status` - Node status changes

## 🤝 Contributing

Contributions are welcome. Please refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines, code standards, and submission procedures.

Areas of particular interest:
- Additional platform integrations (GCP Cloud Run, Azure Container Instances)
- Enhanced component library (ML frameworks, data connectors)
- Performance optimizations for large-scale workflows
- UI/UX improvements for the visual designer

## 📄 License

TwinGraph is distributed under the [MIT-0 License](LICENSE) (MIT No Attribution). See LICENSE file for details.

## 🙏 Acknowledgments

TwinGraph was originally developed by the Autonomous Computing Team at AWS. For more information about the original project and its contributors, please visit the [official AWS samples repository](https://github.com/aws-samples/twingraph).

## 📖 Documentation

### Getting Started
- **[Quick Start Guide](docs/Getting_Started.md)** - Installation and first workflow
- **[OS Installation Guide](docs/OS_Installation_Guide.md)** - Detailed Windows/Linux/macOS instructions
- **[Architecture Overview](docs/Architecture.md)** - System design and components
- **[API Reference](docs/API_Reference.md)** - Complete API documentation
- **[Known Limitations](docs/Known_Limitations.md)** - Current constraints and workarounds

### Advanced Topics
- **[Manual Installation](docs/ManualInstallation.md)** - Step-by-step setup instructions
- **[Port Forwarding](docs/PortForwarding.md)** - Network configuration guide
- **[Legacy API](docs/APIDoc.md)** - Original decorator documentation
- **[Dependency Updates](docs/Dependency_Updates.md)** - Latest dependency versions and migration notes
- **[Modern Features](docs/Modern_Features.md)** - Async/await, streaming LLMs, GraphQL, and plugins
- **[Graph Visualization](docs/Graph_Visualization.md)** - Enhanced graph visualizer with Gremlin queries

### Resources
- **Issue Tracker**: [GitHub Issues](https://github.com/aws-samples/twingraph/issues)
- **Examples**: See `/examples` directory for working demos
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

<p align="center">
  <b>TwinGraph</b> - Container Orchestration for GenAI Workflows
</p>