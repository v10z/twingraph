# Demo 12: Async Components

This example demonstrates TwinGraph v2's modern async/await capabilities for building high-performance concurrent workflows.

## Features Demonstrated

### 1. **Async Components**
- Native `async/await` support with `@async_component` decorator
- Automatic async-to-sync bridging for compatibility
- Concurrent execution with proper error handling

### 2. **Parallel Processing**
- Concurrent URL fetching with rate limiting (semaphores)
- Batch processing with `asyncio.gather()`
- Connection pooling for database operations

### 3. **Performance Features**
- Built-in caching with TTL
- Automatic retries with exponential backoff
- Resource limits and timeout management

### 4. **Stream Processing**
- Async generators for streaming data
- Sliding window analytics
- Real-time statistics calculation

## Components

### Web Scraping
- `fetch_url`: Async HTTP client with caching
- `parallel_fetch`: Concurrent URL fetching with rate limiting

### Data Processing
- `async_data_processor`: Parallel batch processing
- `async_ml_inference`: Concurrent ML predictions

### Database Operations
- `async_database_operations`: Connection pooling and concurrent queries

### Stream Processing
- `async_stream_processor`: Real-time stream analytics

## Running the Example

```bash
cd examples/orchestration_demos/demo_12_async_components
python deployment.py
```

## Expected Output

```
Starting async workflow demonstration...

1. Fetching 5 URLs concurrently...
   Fetched 5/5 successfully in 1.23s

2. Processing fetched data in parallel batches...
   Processed 5 items in 3 batches

3. Running async ML inference...
   Inference complete: 60.0% positive
   Average confidence: 0.875

4. Performing async database operations...
   Database operations: 5 successful, 0 failed

5. Processing streaming data...
   Processed 1000 stream items
   Final window size: 50

============================================================
ASYNC WORKFLOW COMPLETE
============================================================
Total execution time: 12.45s
```

## Key Advantages

1. **Concurrency**: Multiple operations run in parallel, reducing total execution time
2. **Efficiency**: Non-blocking I/O allows better resource utilization
3. **Scalability**: Handle thousands of concurrent operations with minimal overhead
4. **Resilience**: Built-in retry mechanisms and error handling

## Use Cases

- High-throughput data processing pipelines
- Real-time stream analytics
- Web scraping and API aggregation
- Concurrent database operations
- Microservice orchestration