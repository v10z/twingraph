# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

# Modern Features in TwinGraph v2

This document describes the modern functionality updates added to TwinGraph v2, enabling support for cutting-edge tools and frameworks.

## Table of Contents

1. [Async/Await Support](#asyncawait-support)
2. [Streaming LLM Components](#streaming-llm-components)
3. [OpenTelemetry Instrumentation](#opentelemetry-instrumentation)
4. [GraphQL Subscriptions](#graphql-subscriptions)
5. [Modern ML Frameworks](#modern-ml-frameworks)
6. [Plugin System](#plugin-system)

## Async/Await Support

TwinGraph v2 introduces native async/await support for components, enabling efficient handling of I/O-bound operations and concurrent execution.

### Basic Async Component

```python
from twingraph import async_component

@async_component(platform='local')
async def fetch_data(url: str) -> dict:
    """Asynchronous data fetching component."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

# Usage in workflow
data = await fetch_data("https://api.example.com/data")
```

### Advanced Configuration

```python
@async_component(
    platform='docker',
    config={
        'docker_image': 'python:3.12',
        'timeout': 300,
        'memory': 2048,
        'retry_policy': {
            'max_attempts': 3,
            'backoff': 'exponential'
        },
        'cache_enabled': True,
        'cache_ttl': 3600
    }
)
async def process_async(data: List[float]) -> Dict[str, float]:
    """Component with advanced configuration."""
    # Async processing logic
    return {'result': sum(data)}
```

### Benefits

- **Non-blocking I/O**: Handle multiple requests concurrently
- **Resource efficiency**: Better CPU utilization for I/O-bound tasks
- **Built-in retry logic**: Automatic retries with exponential backoff
- **Caching support**: Reduce redundant computations

## Streaming LLM Components

Support for streaming responses from Large Language Models, essential for real-time user experiences.

### Basic Streaming

```python
from twingraph.components.llm import streaming_llm_component, OpenAIProvider

@streaming_llm_component(model='gpt-4', temperature=0.7)
async def chat_assistant(messages: List[Dict[str, str]], provider: OpenAIProvider):
    """Streaming chat assistant."""
    prompt = format_messages(messages)
    async for chunk in provider.stream(prompt):
        yield chunk['content']

# Usage
provider = OpenAIProvider(api_key="your-key")
async for response in chat_assistant(messages, provider):
    print(response, end='', flush=True)
```

### Multi-Modal Streaming

```python
@streaming_llm_component(model='gpt-4-vision', max_tokens=4096)
async def analyze_image(image_data: bytes, prompt: str, provider):
    """Stream analysis of images."""
    async for analysis in provider.analyze_image(image_data, prompt):
        yield {
            'type': analysis['type'],
            'content': analysis['content'],
            'confidence': analysis.get('confidence', 0.0)
        }
```

### RAG with Streaming

```python
from twingraph.components.llm import RAGComponent

rag = RAGComponent(vector_store, llm_provider)

async for chunk in rag.query("What is quantum computing?"):
    if chunk['type'] == 'content':
        print(chunk['text'], end='')
    elif chunk['type'] == 'sources':
        print("\nSources:", chunk['sources'])
```

## OpenTelemetry Instrumentation

Comprehensive observability with distributed tracing and metrics collection.

### Automatic Instrumentation

```python
from twingraph.core.telemetry import initialize_telemetry

# Initialize at startup
telemetry = initialize_telemetry(
    service_name="my-workflow",
    otlp_endpoint="localhost:4317"
)

# Components are automatically traced
@async_component()
@trace_component("data_processing")
async def process_data(data: List[float]) -> float:
    return sum(data) / len(data)
```

### Custom Metrics

```python
from twingraph.core.telemetry import get_telemetry

telemetry = get_telemetry()

# Record custom metrics
telemetry.record_custom_metric(
    name="model_accuracy",
    value=0.95,
    labels={"model": "resnet50", "dataset": "imagenet"}
)

# Manual spans for fine-grained tracing
with telemetry.span("custom_operation", attributes={"batch_size": 32}):
    # Your operation
    result = expensive_computation()
```

### Metrics Available

- **Component Metrics**:
  - Execution count
  - Execution duration (histogram)
  - Error rate
  - Success rate

- **Workflow Metrics**:
  - Active workflows
  - Workflow duration
  - Task queue size

- **Custom Metrics**:
  - Model accuracy
  - Throughput
  - Resource utilization

## GraphQL Subscriptions

Real-time updates for workflow execution and monitoring.

### Execution Updates

```graphql
subscription ExecutionUpdates($executionId: String!) {
  executionUpdates(executionId: $executionId) {
    executionId
    workflowId
    status
    nodeId
    nodeStatus
    progress
    message
    timestamp
  }
}
```

### Real-time Visualization

```graphql
subscription GraphVisualization($executionId: String!) {
  graphVisualization(executionId: $executionId) {
    executionId
    nodes {
      id
      status
      position
      data
    }
    edges {
      source
      target
    }
    timestamp
  }
}
```

### Component Metrics Stream

```graphql
subscription MetricsStream($components: [String!]) {
  componentMetricsStream(componentNames: $components) {
    componentName
    executionTime
    memoryUsage
    cpuUsage
    throughput
    errorRate
    timestamp
  }
}
```

### Client Implementation

```javascript
// JavaScript/TypeScript client
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'ws://localhost:8000/graphql',
});

const unsubscribe = client.subscribe({
  query: `
    subscription {
      executionUpdates(workflowId: "workflow-123") {
        nodeId
        nodeStatus
        progress
      }
    }
  `,
  next: (data) => {
    console.log('Update:', data);
  },
  error: (err) => {
    console.error('Error:', err);
  },
});
```

## Modern ML Frameworks

Native support for JAX, PyTorch Lightning, and Hugging Face Transformers.

### JAX Integration

```python
from twingraph.components.ml import jax_training

result = await jax_training(
    model_config={
        'architecture': 'transformer',
        'num_layers': 12,
        'hidden_dim': 768,
        'num_heads': 12
    },
    dataset_path='/data/dataset.tfrecord',
    hyperparameters={
        'learning_rate': 0.001,
        'epochs': 100,
        'batch_size': 32
    }
)
```

### PyTorch Lightning

```python
from twingraph.components.ml import lightning_training

@async_component(platform='gpu', config={'devices': 2})
async def train_vision_model(data_module, config):
    """Multi-GPU training with PyTorch Lightning."""
    result = await lightning_training(
        model_class='EfficientNet',
        data_module=data_module,
        config={
            'epochs': 50,
            'precision': 16,  # Mixed precision
            'gradient_clip': 1.0,
            'accumulate_grad_batches': 4
        }
    )
    return result
```

### Hugging Face Fine-tuning

```python
@async_component(
    platform='kubernetes',
    config={'resources': {'gpu': '8'}}
)
async def finetune_llama(dataset: str):
    """Fine-tune Llama model on custom dataset."""
    return await finetune_llm(
        model_name='meta-llama/Llama-2-7b-hf',
        dataset_name=dataset,
        training_config={
            'epochs': 3,
            'batch_size': 4,
            'gradient_checkpointing': True,
            'fp16': True
        }
    )
```

## Plugin System

Extensible architecture for custom executors and components.

### Creating a Plugin

```python
# my_plugin.py
from twingraph.core.plugins import PluginInterface, ExecutorPlugin

class MyCustomExecutor(ExecutorPlugin):
    async def execute(self, code: str, inputs: dict, config: dict) -> dict:
        # Custom execution logic
        return {'result': 'executed'}
    
    def get_supported_languages(self) -> List[str]:
        return ['mylang', 'ml']
    
    def validate_code(self, code: str) -> bool:
        return True

class MyPlugin(PluginInterface):
    name = "my_custom_plugin"
    version = "1.0.0"
    description = "Custom executors and components"
    author = "Me"
    
    def initialize(self, config: dict):
        print(f"Initializing {self.name}")
    
    def get_executors(self) -> dict:
        return {'custom': MyCustomExecutor}
    
    def get_components(self) -> dict:
        return {
            'custom_processor': self.create_processor()
        }
    
    def cleanup(self):
        print(f"Cleaning up {self.name}")
```

### Plugin Manifest

```yaml
# scientific_computing.yaml
name: scientific_computing
version: 1.0.0
description: Scientific computing tools

executors:
  - name: matlab
    type: docker
    image: mathworks/matlab:latest
    languages: [matlab, m]
    
  - name: julia
    type: docker
    image: julia:latest
    languages: [julia, jl]

components:
  monte_carlo:
    description: Monte Carlo simulations
    platform: gpu
    inputs:
      - name: iterations
        type: integer
    outputs:
      - name: results
        type: array
```

### Using Plugins

```python
# Plugins are auto-discovered and loaded
# Use custom languages in components

@async_component(platform='docker')
async def matlab_computation(data: np.ndarray) -> dict:
    """Execute MATLAB code."""
    # Language automatically detected from code
    matlab_code = """
    function result = process_data(data)
        result = fft(data);
    end
    """
    return {'fft_result': result}
```

## Integration Example

Combining all modern features in a workflow:

```python
from twingraph import async_component, pipeline
from twingraph.components.llm import streaming_llm_component
from twingraph.core.telemetry import trace_component

@pipeline()
@trace_component("ml_pipeline")
async def modern_ml_workflow():
    """Example using all modern features."""
    
    # Async data loading with caching
    data = await load_dataset(
        source="s3://bucket/data.parquet",
        cache_enabled=True
    )
    
    # Parallel preprocessing using plugins
    preprocessed = await parallel_process(
        data,
        executors=['julia.scientific', 'rust.fast_compute']
    )
    
    # JAX model training with telemetry
    model = await train_jax_model(
        preprocessed,
        config={'accelerator': 'tpu', 'devices': 8}
    )
    
    # Streaming inference with GraphQL updates
    async for prediction in streaming_inference(model, test_data):
        # Real-time updates via GraphQL
        await publish_prediction_update(prediction)
    
    return model

# Execute with monitoring
workflow = modern_ml_workflow()
```

## Best Practices

1. **Use async components** for I/O-bound operations
2. **Enable telemetry** in production for observability
3. **Implement streaming** for user-facing LLM applications
4. **Create plugins** for domain-specific functionality
5. **Subscribe to GraphQL** for real-time monitoring
6. **Choose appropriate ML framework** based on use case:
   - JAX for research and TPU workloads
   - PyTorch Lightning for production training
   - Hugging Face for NLP tasks

## Migration Guide

To migrate existing components to modern features:

```python
# Old style
@component()
def old_component(data):
    result = process(data)
    return namedtuple('Output', ['result'])(result)

# New style with modern features
@async_component(
    platform='local',
    config={'cache_enabled': True}
)
@trace_component("processing")
async def new_component(data: List[float]) -> Dict[str, float]:
    result = await async_process(data)
    return {'result': result}
```

## Performance Considerations

- **Async overhead**: Use sync components for CPU-bound tasks
- **Streaming buffer size**: Configure based on network conditions
- **Telemetry sampling**: Use sampling in high-throughput scenarios
- **Plugin loading**: Lazy-load plugins to reduce startup time
- **GraphQL subscriptions**: Implement backpressure for high-frequency updates

## Troubleshooting

### Async Components Not Running
- Ensure event loop is running: `asyncio.run(main())`
- Check for blocking calls in async functions

### Streaming Interruptions
- Implement reconnection logic
- Use appropriate timeout values

### Missing Telemetry Data
- Verify OTLP endpoint is accessible
- Check firewall rules for port 4317

### Plugin Loading Failures
- Verify plugin implements required interface
- Check plugin dependencies are installed
- Review plugin logs in `~/.twingraph/logs/`

## Future Roadmap

- WebAssembly (WASM) executor support
- Distributed training orchestration
- AutoML component library
- Real-time collaborative workflow editing
- Native cloud integrations (GCP, Azure)
- Edge computing support