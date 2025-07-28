"""
Demo 12: Async Components with TwinGraph v2

This example demonstrates modern async/await patterns for building
high-performance concurrent workflows.
"""

import asyncio
from typing import List, Dict, Any, NamedTuple
from collections import namedtuple
import aiohttp
import time

from twingraph import async_component, pipeline
from twingraph.core.telemetry import trace_component

# Graph configuration for Docker environment
GRAPH_CONFIG = {'graph_endpoint': 'ws://tinkergraph-server:8182'}


# ============================================================================
# Async Web Scraping Components
# ============================================================================

@async_component(
    platform='local',
    graph_config=GRAPH_CONFIG,
    config={
        'timeout': 30,
        'cache_enabled': True,
        'cache_ttl': 3600
    }
)
@trace_component("web_fetch")
async def fetch_url(url: str, headers: Dict[str, str] = None) -> NamedTuple:
    """
    Async HTTP fetch with automatic retries and caching.
    """
    if headers is None:
        headers = {'User-Agent': 'TwinGraph/2.0'}
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, headers=headers) as response:
                content = await response.text()
                Output = namedtuple('Output', ['content', 'status', 'headers'])
                return Output(
                    content=content,
                    status=response.status,
                    headers=dict(response.headers)
                )
        except Exception as e:
            Output = namedtuple('Output', ['content', 'status', 'headers'])
            return Output(content=f"Error: {str(e)}", status=0, headers={})


@async_component(
    platform='local',
    graph_config=GRAPH_CONFIG,
    config={'timeout': 60}
)
async def parallel_fetch(urls: List[str]) -> NamedTuple:
    """
    Fetch multiple URLs concurrently with rate limiting.
    """
    # Create semaphore for rate limiting (max 5 concurrent requests)
    semaphore = asyncio.Semaphore(5)
    
    async def fetch_with_limit(url: str):
        async with semaphore:
            result = await fetch_url(url)
            return {'url': url, 'result': result}
    
    # Fetch all URLs concurrently
    tasks = [fetch_with_limit(url) for url in urls]
    results = await asyncio.gather(*tasks)
    
    Output = namedtuple('Output', ['results', 'total_fetched', 'successful'])
    successful = sum(1 for r in results if r['result']['outputs']['status'] == 200)
    
    return Output(
        results=results,
        total_fetched=len(results),
        successful=successful
    )


# ============================================================================
# Async Data Processing Components
# ============================================================================

@async_component(
    platform='local',
    graph_config=GRAPH_CONFIG,
    config={
        'timeout': 120,
        'memory': 2048
    }
)
async def async_data_processor(
    data: List[Dict[str, Any]],
    batch_size: int = 100
) -> NamedTuple:
    """
    Process data in parallel batches with async operations.
    """
    async def process_batch(batch: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # Simulate async processing (e.g., API calls, DB operations)
        await asyncio.sleep(0.1)
        
        processed = []
        for item in batch:
            # Transform data
            processed_item = {
                'id': item.get('id'),
                'processed': True,
                'timestamp': time.time(),
                'data_length': len(str(item)),
                'hash': hash(str(item))
            }
            processed.append(processed_item)
        
        return processed
    
    # Split data into batches
    batches = [data[i:i + batch_size] for i in range(0, len(data), batch_size)]
    
    # Process batches concurrently
    tasks = [process_batch(batch) for batch in batches]
    batch_results = await asyncio.gather(*tasks)
    
    # Flatten results
    all_results = [item for batch in batch_results for item in batch]
    
    Output = namedtuple('Output', ['processed_data', 'batch_count', 'total_items'])
    return Output(
        processed_data=all_results,
        batch_count=len(batches),
        total_items=len(all_results)
    )


@async_component(
    platform='docker',
    graph_config=GRAPH_CONFIG,
    config={
        'docker_image': 'python:3.11-slim',
        'environment': {'PYTHONUNBUFFERED': '1'}
    }
)
async def async_ml_inference(
    data: List[Any],
    model_name: str = 'sentiment-analysis'
) -> NamedTuple:
    """
    Async ML inference with batching and parallel processing.
    """
    # Simulate loading model asynchronously
    await asyncio.sleep(0.5)
    
    async def predict_batch(batch: List[Any]) -> List[Dict[str, Any]]:
        # Simulate async inference
        await asyncio.sleep(0.2)
        
        predictions = []
        for item in batch:
            # Mock prediction
            prediction = {
                'input': str(item)[:50],
                'prediction': 'positive' if hash(str(item)) % 2 == 0 else 'negative',
                'confidence': 0.85 + (hash(str(item)) % 15) / 100
            }
            predictions.append(prediction)
        
        return predictions
    
    # Process in batches of 50
    batch_size = 50
    batches = [data[i:i + batch_size] for i in range(0, len(data), batch_size)]
    
    # Run inference on all batches concurrently
    tasks = [predict_batch(batch) for batch in batches]
    batch_predictions = await asyncio.gather(*tasks)
    
    # Flatten predictions
    all_predictions = [pred for batch in batch_predictions for pred in batch]
    
    # Calculate statistics
    positive_count = sum(1 for p in all_predictions if p['prediction'] == 'positive')
    avg_confidence = sum(p['confidence'] for p in all_predictions) / len(all_predictions)
    
    Output = namedtuple('Output', [
        'predictions', 'positive_ratio', 'average_confidence', 'model_used'
    ])
    return Output(
        predictions=all_predictions,
        positive_ratio=positive_count / len(all_predictions),
        average_confidence=avg_confidence,
        model_used=model_name
    )


# ============================================================================
# Async Stream Processing Components
# ============================================================================

@async_component(
    platform='local',
    graph_config=GRAPH_CONFIG,
    config={
        'streaming': True,
        'timeout': 300
    }
)
async def async_stream_processor(
    stream_url: str,
    window_size: int = 100
) -> NamedTuple:
    """
    Process streaming data with sliding window analytics.
    """
    window = []
    processed_count = 0
    
    async def process_stream():
        nonlocal processed_count
        
        # Simulate streaming data
        for i in range(1000):
            await asyncio.sleep(0.01)  # Simulate stream delay
            
            # New data point
            data_point = {
                'timestamp': time.time(),
                'value': i * 2.5,
                'id': f'stream_{i}'
            }
            
            # Add to window
            window.append(data_point)
            if len(window) > window_size:
                window.pop(0)
            
            processed_count += 1
            
            # Calculate window statistics every 10 items
            if processed_count % 10 == 0:
                yield {
                    'window_avg': sum(d['value'] for d in window) / len(window),
                    'window_size': len(window),
                    'processed': processed_count
                }
    
    # Collect stream statistics
    stats = []
    async for stat in process_stream():
        stats.append(stat)
    
    Output = namedtuple('Output', [
        'total_processed', 'final_window_size', 'statistics'
    ])
    return Output(
        total_processed=processed_count,
        final_window_size=len(window),
        statistics=stats
    )


# ============================================================================
# Async Database Components
# ============================================================================

@async_component(
    platform='kubernetes',
    graph_config=GRAPH_CONFIG,
    config={
        'resources': {'cpu': '2', 'memory': '4Gi'},
        'retry_policy': {
            'max_attempts': 5,
            'backoff': 'exponential',
            'initial_delay': 1.0
        }
    }
)
async def async_database_operations(
    operation: str,
    data: List[Dict[str, Any]],
    connection_pool_size: int = 10
) -> NamedTuple:
    """
    Perform async database operations with connection pooling.
    """
    # Simulate connection pool
    pool = asyncio.Semaphore(connection_pool_size)
    
    async def execute_query(item: Dict[str, Any]) -> Dict[str, Any]:
        async with pool:
            # Simulate DB operation
            await asyncio.sleep(0.05)
            
            if operation == 'insert':
                return {'id': item.get('id'), 'inserted': True}
            elif operation == 'update':
                return {'id': item.get('id'), 'updated': True}
            elif operation == 'select':
                return {'id': item.get('id'), 'data': item, 'found': True}
            else:
                return {'id': item.get('id'), 'error': 'Unknown operation'}
    
    # Execute all operations concurrently
    tasks = [execute_query(item) for item in data]
    results = await asyncio.gather(*tasks)
    
    # Count successes
    successful = sum(1 for r in results if not r.get('error'))
    
    Output = namedtuple('Output', [
        'results', 'successful_operations', 'failed_operations', 'operation_type'
    ])
    return Output(
        results=results,
        successful_operations=successful,
        failed_operations=len(results) - successful,
        operation_type=operation
    )


# ============================================================================
# Pipeline Definition
# ============================================================================

@pipeline(
    name='async_workflow_pipeline',
    monitoring_enabled=True,
    clear_graph=True,
    graph_config=GRAPH_CONFIG
)
async def async_workflow():
    """
    Demonstrate async component capabilities with concurrent execution.
    """
    print("Starting async workflow demonstration...")
    
    # Step 1: Fetch multiple URLs concurrently
    urls = [
        'https://api.github.com/repos/python/cpython',
        'https://api.github.com/repos/microsoft/vscode',
        'https://api.github.com/repos/facebook/react',
        'https://api.github.com/repos/tensorflow/tensorflow',
        'https://api.github.com/repos/kubernetes/kubernetes'
    ]
    
    print(f"\n1. Fetching {len(urls)} URLs concurrently...")
    start_time = time.time()
    
    fetch_results = await parallel_fetch(urls)
    
    fetch_time = time.time() - start_time
    print(f"   Fetched {fetch_results['outputs']['successful']}/{fetch_results['outputs']['total_fetched']} successfully in {fetch_time:.2f}s")
    
    # Step 2: Process fetched data asynchronously
    print("\n2. Processing fetched data in parallel batches...")
    
    # Extract data from successful fetches
    fetched_data = [
        {
            'id': r['url'],
            'content_length': len(r['result']['outputs']['content']),
            'status': r['result']['outputs']['status']
        }
        for r in fetch_results['outputs']['results']
        if r['result']['outputs']['status'] == 200
    ]
    
    processed = await async_data_processor(
        data=fetched_data,
        batch_size=2,
        parent_hash=fetch_results['hash']
    )
    
    print(f"   Processed {processed['outputs']['total_items']} items in {processed['outputs']['batch_count']} batches")
    
    # Step 3: Run ML inference on processed data
    print("\n3. Running async ML inference...")
    
    inference_data = [item['data_length'] for item in processed['outputs']['processed_data']]
    
    ml_results = await async_ml_inference(
        data=inference_data,
        model_name='content-classifier',
        parent_hash=processed['hash']
    )
    
    print(f"   Inference complete: {ml_results['outputs']['positive_ratio']:.1%} positive")
    print(f"   Average confidence: {ml_results['outputs']['average_confidence']:.3f}")
    
    # Step 4: Simulate database operations
    print("\n4. Performing async database operations...")
    
    db_data = [
        {'id': pred['input'], 'prediction': pred['prediction'], 'confidence': pred['confidence']}
        for pred in ml_results['outputs']['predictions']
    ]
    
    db_results = await async_database_operations(
        operation='insert',
        data=db_data,
        connection_pool_size=5,
        parent_hash=ml_results['hash']
    )
    
    print(f"   Database operations: {db_results['outputs']['successful_operations']} successful, "
          f"{db_results['outputs']['failed_operations']} failed")
    
    # Step 5: Stream processing simulation
    print("\n5. Processing streaming data...")
    
    stream_results = await async_stream_processor(
        stream_url='mock://data-stream',
        window_size=50,
        parent_hash=db_results['hash']
    )
    
    print(f"   Processed {stream_results['outputs']['total_processed']} stream items")
    print(f"   Final window size: {stream_results['outputs']['final_window_size']}")
    
    # Final summary
    total_time = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"ASYNC WORKFLOW COMPLETE")
    print(f"{'='*60}")
    print(f"Total execution time: {total_time:.2f}s")
    print(f"Demonstrates:")
    print(f"  - Concurrent URL fetching with rate limiting")
    print(f"  - Parallel batch processing")
    print(f"  - Async ML inference")
    print(f"  - Database connection pooling")
    print(f"  - Stream processing with windowing")
    
    return {
        'total_time': total_time,
        'urls_fetched': fetch_results['outputs']['total_fetched'],
        'items_processed': processed['outputs']['total_items'],
        'predictions_made': len(ml_results['outputs']['predictions']),
        'db_operations': db_results['outputs']['successful_operations'],
        'stream_items': stream_results['outputs']['total_processed']
    }


# ============================================================================
# Main Execution
# ============================================================================

if __name__ == '__main__':
    # Run the async pipeline
    asyncio.run(async_workflow())