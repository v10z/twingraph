# TwinGraph API Reference

## Table of Contents
- [Core Decorators](#core-decorators)
  - [@component](#component)
  - [@pipeline](#pipeline)
- [REST API Endpoints](#rest-api-endpoints)
  - [Workflow Management](#workflow-management)
  - [Execution Control](#execution-control)
  - [Monitoring](#monitoring)
- [WebSocket Events](#websocket-events)
- [Python SDK](#python-sdk)
- [Component Types](#component-types)

## Core Decorators

### @component

The `@component` decorator transforms Python functions into reusable workflow components that can be executed across different platforms.

```python
from twingraph import component
from typing import NamedTuple

@component(
    platform='docker',  # 'local', 'docker', 'kubernetes', 'lambda', 'batch'
    docker_image='python:3.9',
    config={
        'memory': '2G',
        'cpu': '1.0',
        'timeout': 300
    }
)
def process_data(data: list, threshold: float = 0.5) -> NamedTuple:
    """Process input data with configurable threshold."""
    Output = namedtuple('Output', ['filtered', 'count'])
    filtered = [x for x in data if x > threshold]
    return Output(filtered=filtered, count=len(filtered))
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `platform` | str | 'local' | Execution platform: 'local', 'docker', 'kubernetes', 'lambda', 'batch' |
| `docker_image` | str | None | Docker image for containerized execution |
| `config` | dict | {} | Platform-specific configuration |
| `retry_policy` | dict | None | Retry configuration with max_attempts and backoff |
| `timeout` | int | 300 | Maximum execution time in seconds |
| `resources` | dict | {} | Resource requirements (cpu, memory, gpu) |
| `environment` | dict | {} | Environment variables |
| `labels` | dict | {} | Metadata labels for tracking |

#### Platform-Specific Configurations

**Docker Configuration:**
```python
config={
    'memory': '4G',
    'cpu': '2.0',
    'gpu': False,
    'volumes': {'/data': '/container/data'},
    'network': 'bridge'
}
```

**Kubernetes Configuration:**
```python
config={
    'namespace': 'default',
    'resources': {
        'requests': {'cpu': '500m', 'memory': '1Gi'},
        'limits': {'cpu': '2000m', 'memory': '4Gi'}
    },
    'node_selector': {'node-type': 'compute'},
    'pull_policy': 'Always'
}
```

**AWS Lambda Configuration:**
```python
config={
    'function_name': 'my-processor',
    'runtime': 'python3.9',
    'memory_size': 3008,
    'timeout': 900,
    'environment': {'ENV': 'production'},
    'layers': ['arn:aws:lambda:region:account:layer:name:version']
}
```

**AWS Batch Configuration:**
```python
config={
    'job_definition': 'my-job-def',
    'job_queue': 'high-priority',
    'vcpus': 4,
    'memory': 16384,
    'gpu': 0,
    'array_size': 100,  # For array jobs
    'environment': {'PARALLELISM': '4'}
}
```

### @pipeline

The `@pipeline` decorator defines complete workflows by orchestrating component execution.

```python
from twingraph import pipeline, component

@pipeline(
    name="data_processing_pipeline",
    schedule="0 */6 * * *",  # Every 6 hours
    max_parallel=10,
    error_handler='continue'
)
def process_pipeline():
    # Load data
    raw_data = load_data(source='s3://bucket/data.csv')
    
    # Process in parallel
    results = []
    for chunk in raw_data['outputs']['chunks']:
        result = process_chunk(
            data=chunk,
            parent_hash=raw_data['hash']
        )
        results.append(result)
    
    # Aggregate results
    final = aggregate_results(
        results=[r['outputs']['data'] for r in results],
        parent_hashes=[r['hash'] for r in results]
    )
    
    return final
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | str | None | Pipeline identifier |
| `schedule` | str | None | Cron expression for scheduled execution |
| `max_parallel` | int | 10 | Maximum parallel component executions |
| `error_handler` | str | 'fail' | Error handling: 'fail', 'continue', 'retry' |
| `timeout` | int | 3600 | Pipeline timeout in seconds |
| `graph_config` | dict | {} | Graph database configuration |
| `notifications` | dict | {} | Notification settings for pipeline events |

## REST API Endpoints

Base URL: `http://localhost:8000/api`

### Workflow Management

#### List Workflows
```http
GET /api/workflows
```

Query Parameters:
- `page` (int): Page number (default: 1)
- `size` (int): Items per page (default: 20)
- `tag` (str): Filter by tag
- `status` (str): Filter by status

Response:
```json
{
  "workflows": [
    {
      "id": "workflow-123",
      "name": "Data Processing Pipeline",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T14:30:00Z",
      "status": "active",
      "tags": ["production", "etl"]
    }
  ],
  "total": 42,
  "page": 1,
  "size": 20
}
```

#### Get Workflow
```http
GET /api/workflows/{workflow_id}
```

Response:
```json
{
  "id": "workflow-123",
  "name": "Data Processing Pipeline",
  "definition": {
    "nodes": [...],
    "edges": [...],
    "metadata": {...}
  },
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z",
  "executions": 156,
  "success_rate": 0.98
}
```

#### Create/Update Workflow
```http
POST /api/workflows/{workflow_id}
PUT /api/workflows/{workflow_id}
```

Request Body:
```json
{
  "name": "Data Processing Pipeline",
  "definition": {
    "nodes": [
      {
        "id": "node-1",
        "type": "component",
        "component": "load_data",
        "config": {...}
      }
    ],
    "edges": [
      {
        "source": "node-1",
        "target": "node-2",
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  "metadata": {
    "description": "Processes daily data feeds",
    "tags": ["production", "etl"]
  }
}
```

#### Delete Workflow
```http
DELETE /api/workflows/{workflow_id}
```

### Execution Control

#### Execute Workflow
```http
POST /api/executions
```

Request Body:
```json
{
  "workflow_id": "workflow-123",
  "inputs": {
    "source": "s3://bucket/input.csv",
    "threshold": 0.75
  },
  "config": {
    "max_parallel": 5,
    "timeout": 1800
  }
}
```

Response:
```json
{
  "execution_id": "exec-456",
  "workflow_id": "workflow-123",
  "status": "running",
  "started_at": "2024-01-15T15:00:00Z",
  "progress": {
    "total_nodes": 10,
    "completed_nodes": 0,
    "running_nodes": 1
  }
}
```

#### Get Execution Status
```http
GET /api/executions/{execution_id}
```

Response:
```json
{
  "execution_id": "exec-456",
  "workflow_id": "workflow-123",
  "status": "completed",
  "started_at": "2024-01-15T15:00:00Z",
  "completed_at": "2024-01-15T15:05:23Z",
  "duration": 323,
  "progress": {
    "total_nodes": 10,
    "completed_nodes": 10,
    "failed_nodes": 0
  },
  "outputs": {
    "processed_records": 15420,
    "output_path": "s3://bucket/output/result.parquet"
  }
}
```

#### Stop Execution
```http
POST /api/executions/{execution_id}/stop
```

#### Get Execution Logs
```http
GET /api/executions/{execution_id}/logs
```

Query Parameters:
- `component_id` (str): Filter by component
- `level` (str): Log level filter (debug, info, warning, error)
- `start_time` (str): ISO timestamp
- `end_time` (str): ISO timestamp

### Monitoring

#### Get Execution Graph
```http
GET /api/graph/execution/{execution_id}
```

Response:
```json
{
  "nodes": [
    {
      "id": "comp-123",
      "label": "load_data",
      "status": "completed",
      "platform": "docker",
      "started_at": "2024-01-15T15:00:00Z",
      "completed_at": "2024-01-15T15:00:45Z",
      "duration": 45,
      "properties": {
        "input_size": "1.2GB",
        "output_records": 50000
      }
    }
  ],
  "edges": [
    {
      "from": "comp-123",
      "to": "comp-124",
      "label": "data_flow"
    }
  ]
}
```

#### Get Component Metrics
```http
GET /api/metrics/components/{component_id}
```

Response:
```json
{
  "component_id": "comp-123",
  "executions": 1542,
  "success_rate": 0.995,
  "avg_duration": 42.3,
  "p95_duration": 58.2,
  "p99_duration": 89.5,
  "resource_usage": {
    "avg_cpu": 0.75,
    "avg_memory": "1.2GB",
    "peak_memory": "2.1GB"
  }
}
```

## WebSocket Events

Connect to: `ws://localhost:8000/ws`

### Event Types

#### Execution Updates
```json
{
  "event": "execution:update",
  "data": {
    "execution_id": "exec-456",
    "status": "running",
    "progress": {
      "completed_nodes": 5,
      "total_nodes": 10
    }
  }
}
```

#### Node Status Changes
```json
{
  "event": "node:status",
  "data": {
    "execution_id": "exec-456",
    "node_id": "comp-123",
    "status": "completed",
    "duration": 45,
    "outputs": {...}
  }
}
```

#### Error Events
```json
{
  "event": "error",
  "data": {
    "execution_id": "exec-456",
    "node_id": "comp-124",
    "error": "Container failed to start",
    "traceback": "..."
  }
}
```

### Subscribing to Events
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

// Subscribe to specific execution
ws.send(JSON.stringify({
  action: 'subscribe',
  execution_id: 'exec-456'
}));

// Handle events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Event: ${data.event}`, data.data);
};
```

## Python SDK

### Client Initialization
```python
from twingraph.client import TwinGraphClient

client = TwinGraphClient(
    base_url='http://localhost:8000',
    api_key='your-api-key'  # Optional
)
```

### Workflow Operations
```python
# List workflows
workflows = client.workflows.list(tag='production')

# Get workflow
workflow = client.workflows.get('workflow-123')

# Create workflow from code
from twingraph import Workflow

wf = Workflow(name='My Pipeline')
wf.add_component('load', load_data)
wf.add_component('process', process_data)
wf.connect('load', 'process')

workflow_id = client.workflows.create(wf)

# Execute workflow
execution = client.executions.create(
    workflow_id='workflow-123',
    inputs={'source': 's3://bucket/data.csv'}
)

# Monitor execution
status = client.executions.get_status(execution.id)
logs = client.executions.get_logs(execution.id)
```

### Async Operations
```python
import asyncio
from twingraph.client import AsyncTwinGraphClient

async def main():
    async with AsyncTwinGraphClient('http://localhost:8000') as client:
        # Execute workflow asynchronously
        execution = await client.executions.create_async(
            workflow_id='workflow-123',
            inputs={'source': 's3://bucket/data.csv'}
        )
        
        # Wait for completion
        result = await client.executions.wait_for_completion(
            execution.id,
            timeout=1800
        )
        
        print(f"Execution completed: {result.outputs}")

asyncio.run(main())
```

## Component Types

### Built-in Components

TwinGraph provides pre-built components that can be used directly in workflows:

```python
from twingraph.components import (
    FileReader,
    DatabaseQuery,
    LLMPrompt,
    VectorSearch,
    DataTransform
)

# File operations
reader = FileReader(format='parquet')
data = reader(path='s3://bucket/data.parquet')

# Database operations  
query = DatabaseQuery(connection='postgresql://...')
results = query(sql="SELECT * FROM users WHERE active = true")

# AI operations
llm = LLMPrompt(model='gpt-4', temperature=0.7)
response = llm(prompt="Summarize this text: {text}", text=document)

# Vector operations
search = VectorSearch(index='products', top_k=10)
similar = search(embedding=query_vector)
```

### Custom Component Development

```python
from twingraph import BaseComponent

class CustomProcessor(BaseComponent):
    """Custom data processing component."""
    
    def __init__(self, config=None):
        super().__init__(config)
        self.threshold = config.get('threshold', 0.5)
    
    def validate_inputs(self, **kwargs):
        """Validate input parameters."""
        if 'data' not in kwargs:
            raise ValueError("Missing required input: data")
        
    def execute(self, data, **kwargs):
        """Process the data."""
        filtered = [x for x in data if x > self.threshold]
        return {
            'filtered': filtered,
            'count': len(filtered),
            'threshold': self.threshold
        }

# Register custom component
from twingraph.registry import register_component
register_component('custom_processor', CustomProcessor)
```

## Error Handling

### Retry Policies

```python
@component(
    retry_policy={
        'max_attempts': 3,
        'backoff': 'exponential',
        'initial_delay': 1,
        'max_delay': 60,
        'exceptions': ['TransientError', 'TimeoutError']
    }
)
def flaky_operation(data):
    # Component with automatic retries
    pass
```

### Error Handlers

```python
@pipeline(
    error_handler='custom',
    error_config={
        'handler': 'error_notification',
        'continue_on_error': True
    }
)
def fault_tolerant_pipeline():
    try:
        result = risky_operation()
    except Exception as e:
        result = fallback_operation()
    return result
```

## Rate Limiting

API endpoints implement rate limiting:

- **Default limits**: 100 requests per minute
- **Bulk operations**: 10 requests per minute
- **WebSocket connections**: 10 concurrent per client

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705329600
```

## Authentication

### API Key Authentication
```bash
curl -H "X-API-Key: your-api-key" http://localhost:8000/api/workflows
```

### Token Authentication
```python
client = TwinGraphClient(
    base_url='http://localhost:8000',
    auth_token='Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
)
```

## Versioning

The API follows semantic versioning. The current version is `v2.0.0`.

Version is specified in the Accept header:
```
Accept: application/vnd.twingraph.v2+json
```

## SDK Installation

```bash
pip install twingraph-sdk
```

For development:
```bash
pip install twingraph-sdk[dev]
```