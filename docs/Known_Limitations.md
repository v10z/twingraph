# Known Limitations and Issues

## Table of Contents
- [General Limitations](#general-limitations)
- [Platform-Specific Limitations](#platform-specific-limitations)
- [Performance Considerations](#performance-considerations)
- [Known Issues](#known-issues)
- [Workarounds](#workarounds)
- [Future Improvements](#future-improvements)

## General Limitations

### Component Development

1. **NamedTuple Return Requirement**
   - All components must return a NamedTuple with the name 'outputs'
   - This is required for the graph tracing and serialization system
   ```python
   # Correct
   Output = namedtuple('Output', ['data', 'count'])
   return Output(data=result, count=len(result))
   
   # Incorrect - will fail
   return {'data': result, 'count': len(result)}
   ```

2. **Serialization Constraints**
   - Component inputs/outputs must be JSON-serializable
   - Complex objects (e.g., Pandas DataFrames) need explicit serialization
   - Binary data should be saved to storage and referenced by path

3. **Code String Limitations**
   - Components using remote execution have their code stringified
   - External imports must be available in the execution environment
   - Local file dependencies need to be packaged with the component

### Workflow Limitations

1. **Manual Parent Hash Specification**
   - Parent component hashes must be specified manually in pipelines
   - Auto-inference is available but incompatible with Celery execution
   ```python
   # Manual specification required
   result = process_data(
       data=input_data['outputs']['data'],
       parent_hash=input_data['hash']
   )
   ```

2. **Keyword Arguments Preference**
   - Function calls should use keyword arguments for clarity
   - Positional arguments may cause issues with remote execution

3. **Circular Dependencies**
   - The system does not support circular dependencies in workflows
   - DAG (Directed Acyclic Graph) structure is enforced

## Platform-Specific Limitations

### AWS Lambda

1. **Payload Size Limits**
   - Request payload: 6 MB (synchronous)
   - Response payload: 6 MB
   - Use `extended_output=True` for larger outputs (stores in CloudWatch)
   - Extended output not recommended for high-concurrency scenarios

2. **Execution Time**
   - Maximum timeout: 15 minutes
   - Long-running tasks should use AWS Batch instead

3. **Memory Constraints**
   - Maximum memory: 10,240 MB
   - CPU scales with memory allocation

### AWS Batch

1. **Startup Time**
   - Job submission has inherent latency (10-30 seconds)
   - Not suitable for low-latency requirements

2. **Environment Configuration**
   - AWS CLI must be configured externally
   - IAM roles and compute environments must be pre-provisioned
   - Default support for ECS/EC2; Fargate requires additional configuration
   - EKS on Batch is not currently supported

### Kubernetes

1. **Resource Limits**
   - Subject to cluster resource quotas
   - Pod startup time varies with image size

2. **Image Availability**
   - Images must be accessible from the cluster
   - Private registries require pre-configured credentials

### Docker (Local)

1. **GPU Support**
   - Local GPU execution requires manual Docker resource configuration
   - Cloud deployments (Batch, K8s) handle GPU allocation automatically

2. **Resource Contention**
   - Local Docker shares system resources
   - Performance varies with system load

### Celery

1. **Startup Performance**
   - Large numbers of concurrent workers (>32) increase startup time
   - Initial task distribution can be slow with many workers

2. **Single Control Node**
   - Currently limited to one Celery control node
   - This can become a bottleneck for very large deployments

3. **File System Limitations**
   - Concurrent workers (>512) may encounter file write conflicts
   - Shared file systems recommended for large deployments

## Performance Considerations

### Scalability Limits

1. **Graph Database**
   - TinkerGraph: In-memory, suitable for <1M nodes
   - Neptune: Required for production workloads >1M nodes

2. **WebSocket Connections**
   - Real-time monitoring limited by WebSocket connection pool
   - Default: 1000 concurrent connections

3. **API Rate Limits**
   - Default: 100 requests/minute per client
   - Configurable via environment variables

### Memory Usage

1. **Component Output Size**
   - Large outputs impact memory usage
   - Consider streaming or chunking for large datasets

2. **Graph Visualization**
   - Browser performance degrades with >10,000 nodes
   - Use filtering for large execution graphs

## Known Issues

### Celery-Related

1. **Auto-inference Incompatibility**
   - The `auto_infer` flag does not work with Celery pipelines
   - Stack visibility restrictions prevent automatic dependency detection

2. **Misleading Error Messages**
   - Remote execution errors may show generic Celery errors
   - Check platform-specific logs (CloudWatch, kubectl logs) for details

3. **Task Registration**
   - "Received unregistered task" errors require cache clearing
   - Delete `__pycache__` folders or use `pyclean` before deployment

### UI/Visualization

1. **Browser Compatibility**
   - Chrome/Edge recommended for best performance
   - Safari may have WebSocket connection issues

2. **Large Workflow Rendering**
   - Workflows with >500 nodes may be slow to render
   - Use workflow decomposition for better performance

### Platform Integration

1. **Authentication Token Expiry**
   - Cloud platform tokens may expire during long executions
   - Implement token refresh for production deployments

2. **Network Timeouts**
   - Long-running HTTP connections may timeout
   - WebSocket connections provide better reliability

## Workarounds

### Large Data Handling

```python
# Instead of passing large data directly
@component()
def process_large_data(data: list) -> NamedTuple:
    # This may hit size limits
    pass

# Use file references
@component()
def process_large_data(data_path: str) -> NamedTuple:
    Output = namedtuple('Output', ['result_path'])
    # Process data from file
    # Save results to file
    return Output(result_path='s3://bucket/results.parquet')
```

### High Concurrency

```python
# Configure Celery for high concurrency
@pipeline(
    celery_pipeline=True,
    celery_concurrency_threads=64,  # Increase gradually
    celery_config={
        'task_acks_late': True,
        'worker_prefetch_multiplier': 1
    }
)
def high_concurrency_pipeline():
    pass
```

### GPU Workloads

```yaml
# Kubernetes GPU configuration
config:
  resources:
    limits:
      nvidia.com/gpu: 1
  nodeSelector:
    accelerator: nvidia-tesla-v100
```

## Future Improvements

### Planned Enhancements

1. **Multi-Control Node Celery**
   - Distributed Celery control for better scalability
   - Estimated: v2.1.0

2. **Streaming Data Support**
   - Native support for streaming inputs/outputs
   - Kafka/Kinesis integration
   - Estimated: v2.2.0

3. **Improved Error Handling**
   - Unified error reporting across platforms
   - Better error message propagation
   - Estimated: v2.1.0

4. **Enhanced GPU Support**
   - Automatic GPU detection and allocation
   - Multi-GPU component support
   - Estimated: v2.3.0

### Under Consideration

1. **GraphQL API**
   - Alternative to REST for complex queries
   - Better support for nested data fetching

2. **Workflow Versioning**
   - Built-in version control for workflows
   - Automatic rollback capabilities

3. **Cost Optimization**
   - Automatic platform selection based on cost
   - Resource usage predictions

## Reporting Issues

To report new issues or limitations:

1. Check existing issues: [GitHub Issues](https://github.com/aws-samples/twingraph/issues)
2. Provide minimal reproducible example
3. Include relevant logs and error messages
4. Specify TwinGraph version and platform details

## Version Compatibility

| TwinGraph Version | Python | Docker | Kubernetes | AWS CLI |
|-------------------|--------|---------|------------|---------|
| 2.0.x | 3.8-3.11 | 20.10+ | 1.24+ | 2.x |
| 1.x.x | 3.7-3.10 | 19.03+ | 1.21+ | 2.x |

## Resource Requirements

### Minimum Requirements
- RAM: 4GB
- CPU: 2 cores
- Disk: 10GB

### Recommended for Production
- RAM: 16GB+
- CPU: 8+ cores  
- Disk: 100GB+ SSD
- Network: 1Gbps+