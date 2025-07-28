"""
Performance benchmarks for TwinGraph.
"""

import pytest
import time
import statistics
from collections import namedtuple
from typing import List, Dict, Any
import json
import os

from twingraph import component, pipeline
from twingraph.core.logging import global_monitor


class BenchmarkResults:
    """Store and analyze benchmark results."""
    
    def __init__(self, name: str):
        self.name = name
        self.results: List[float] = []
        self.metadata: Dict[str, Any] = {}
    
    def add_result(self, duration: float):
        """Add a benchmark result."""
        self.results.append(duration)
    
    def get_statistics(self) -> Dict[str, float]:
        """Get statistical summary of results."""
        if not self.results:
            return {}
        
        return {
            'min': min(self.results),
            'max': max(self.results),
            'mean': statistics.mean(self.results),
            'median': statistics.median(self.results),
            'stdev': statistics.stdev(self.results) if len(self.results) > 1 else 0,
            'samples': len(self.results)
        }
    
    def save_results(self, filepath: str):
        """Save benchmark results to file."""
        data = {
            'name': self.name,
            'results': self.results,
            'statistics': self.get_statistics(),
            'metadata': self.metadata
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)


@pytest.fixture
def benchmark_dir(tmp_path):
    """Create temporary directory for benchmark results."""
    benchmark_path = tmp_path / "benchmarks"
    benchmark_path.mkdir()
    return benchmark_path


class TestComponentPerformance:
    """Benchmark component execution performance."""
    
    def test_local_component_performance(self, benchmark_dir):
        """Benchmark local component execution."""
        results = BenchmarkResults("local_component_execution")
        
        @component()
        def compute_intensive(size: int) -> namedtuple:
            # Simulate compute-intensive work
            data = list(range(size))
            result = sum(x ** 2 for x in data)
            
            Output = namedtuple('Output', ['result', 'size'])
            return Output(result=result, size=size)
        
        # Warm-up
        for _ in range(5):
            compute_intensive(100)
        
        # Benchmark different sizes
        sizes = [100, 1000, 10000, 100000]
        
        for size in sizes:
            size_results = []
            
            for _ in range(10):  # 10 runs per size
                start = time.time()
                result = compute_intensive(size)
                duration = time.time() - start
                
                size_results.append(duration)
                results.add_result(duration)
            
            avg_time = statistics.mean(size_results)
            print(f"Size {size}: {avg_time:.4f}s (avg)")
        
        results.metadata = {
            'sizes': sizes,
            'runs_per_size': 10
        }
        
        results.save_results(benchmark_dir / "local_component.json")
        
        # Performance assertions
        stats = results.get_statistics()
        assert stats['mean'] < 1.0  # Average should be under 1 second
        assert stats['stdev'] < 0.5  # Low variance expected
    
    def test_component_with_parent_hash_overhead(self, benchmark_dir):
        """Measure overhead of parent hash tracking."""
        results_without = BenchmarkResults("without_parent_hash")
        results_with = BenchmarkResults("with_parent_hash")
        
        @component()
        def simple_component(value: int) -> namedtuple:
            Output = namedtuple('Output', ['value'])
            return Output(value=value * 2)
        
        # Benchmark without parent hash
        for _ in range(100):
            start = time.time()
            result = simple_component(42)
            duration = time.time() - start
            results_without.add_result(duration)
        
        # Benchmark with parent hash
        parent_result = simple_component(21)
        
        for _ in range(100):
            start = time.time()
            result = simple_component(42, parent_hash=parent_result['hash'])
            duration = time.time() - start
            results_with.add_result(duration)
        
        # Compare results
        stats_without = results_without.get_statistics()
        stats_with = results_with.get_statistics()
        
        overhead = (stats_with['mean'] - stats_without['mean']) / stats_without['mean']
        print(f"Parent hash overhead: {overhead * 100:.2f}%")
        
        # Overhead should be minimal
        assert overhead < 0.1  # Less than 10% overhead
    
    @pytest.mark.skipif(
        not os.environ.get('TWINGRAPH_DOCKER_BENCHMARKS'),
        reason="Docker benchmarks disabled by default"
    )
    def test_docker_component_performance(self, benchmark_dir):
        """Benchmark Docker component execution."""
        results = BenchmarkResults("docker_component_execution")
        
        @component(platform='docker', docker_image='python:3.9-slim')
        def docker_compute(data: list) -> namedtuple:
            result = sum(data)
            Output = namedtuple('Output', ['sum'])
            return Output(sum=result)
        
        # Warm-up Docker
        docker_compute([1, 2, 3])
        
        # Benchmark
        test_data = list(range(1000))
        
        for _ in range(10):
            start = time.time()
            result = docker_compute(test_data)
            duration = time.time() - start
            results.add_result(duration)
        
        results.save_results(benchmark_dir / "docker_component.json")
        
        stats = results.get_statistics()
        print(f"Docker execution: {stats['mean']:.2f}s average")
        
        # Docker overhead is expected
        assert stats['mean'] < 5.0  # Should complete within 5 seconds


class TestPipelinePerformance:
    """Benchmark pipeline execution performance."""
    
    def test_sequential_pipeline_performance(self, benchmark_dir):
        """Benchmark sequential pipeline execution."""
        results = BenchmarkResults("sequential_pipeline")
        
        @component()
        def stage1(data: list) -> namedtuple:
            Output = namedtuple('Output', ['processed'])
            return Output(processed=[x * 2 for x in data])
        
        @component()
        def stage2(data: list) -> namedtuple:
            Output = namedtuple('Output', ['filtered'])
            return Output(filtered=[x for x in data if x > 10])
        
        @component()
        def stage3(data: list) -> namedtuple:
            Output = namedtuple('Output', ['result'])
            return Output(result=sum(data))
        
        @pipeline()
        def sequential_pipeline(input_data: list):
            s1 = stage1(input_data)
            s2 = stage2(s1['outputs']['processed'], parent_hash=s1['hash'])
            s3 = stage3(s2['outputs']['filtered'], parent_hash=s2['hash'])
            return s3
        
        # Benchmark different data sizes
        for size in [100, 1000, 10000]:
            test_data = list(range(size))
            
            start = time.time()
            result = sequential_pipeline(test_data)
            duration = time.time() - start
            
            results.add_result(duration)
            print(f"Pipeline size {size}: {duration:.4f}s")
        
        results.save_results(benchmark_dir / "sequential_pipeline.json")
    
    def test_parallel_pipeline_performance(self, benchmark_dir):
        """Benchmark parallel execution patterns."""
        results = BenchmarkResults("parallel_pipeline")
        
        @component()
        def parallel_task(chunk: list, chunk_id: int) -> namedtuple:
            # Simulate work
            time.sleep(0.1)
            result = sum(chunk)
            Output = namedtuple('Output', ['result', 'chunk_id'])
            return Output(result=result, chunk_id=chunk_id)
        
        @component()
        def merge_results(results: list) -> namedtuple:
            total = sum(r['result'] for r in results)
            Output = namedtuple('Output', ['total'])
            return Output(total=total)
        
        @pipeline()
        def parallel_pipeline(data: list, num_chunks: int):
            chunk_size = len(data) // num_chunks
            
            # Split and process in parallel (simulated)
            chunk_results = []
            start_parallel = time.time()
            
            for i in range(num_chunks):
                chunk = data[i*chunk_size:(i+1)*chunk_size]
                result = parallel_task(chunk, i)
                chunk_results.append(result['outputs'])
            
            parallel_time = time.time() - start_parallel
            
            # Merge results
            final = merge_results(chunk_results)
            
            return {
                'result': final,
                'parallel_time': parallel_time,
                'num_chunks': num_chunks
            }
        
        test_data = list(range(10000))
        
        # Test different parallelism levels
        for num_chunks in [1, 2, 4, 8]:
            start = time.time()
            result = parallel_pipeline(test_data, num_chunks)
            duration = time.time() - start
            
            results.add_result(duration)
            print(f"Chunks: {num_chunks}, Time: {duration:.2f}s, "
                  f"Parallel portion: {result['parallel_time']:.2f}s")
        
        results.save_results(benchmark_dir / "parallel_pipeline.json")


class TestScalabilityBenchmarks:
    """Test scalability with increasing load."""
    
    def test_component_scalability(self, benchmark_dir):
        """Test how components scale with input size."""
        results = BenchmarkResults("component_scalability")
        
        @component()
        def scalable_component(data: list) -> namedtuple:
            # O(n log n) algorithm
            sorted_data = sorted(data)
            median = sorted_data[len(sorted_data) // 2]
            
            Output = namedtuple('Output', ['median', 'size'])
            return Output(median=median, size=len(data))
        
        sizes = [100, 1000, 10000, 100000]
        
        for size in sizes:
            test_data = list(range(size, 0, -1))  # Reverse order
            
            times = []
            for _ in range(5):
                start = time.time()
                result = scalable_component(test_data)
                duration = time.time() - start
                times.append(duration)
            
            avg_time = statistics.mean(times)
            results.add_result(avg_time)
            
            print(f"Size {size}: {avg_time:.4f}s")
            
            # Verify O(n log n) scaling
            if size > 100:
                expected_ratio = (size * size.bit_length()) / (100 * 100 .bit_length())
                actual_ratio = avg_time / results.results[0]
                
                # Should scale roughly as O(n log n)
                assert actual_ratio < expected_ratio * 2
        
        results.save_results(benchmark_dir / "component_scalability.json")
    
    def test_graph_recording_overhead(self, benchmark_dir):
        """Measure overhead of graph recording."""
        results = BenchmarkResults("graph_recording_overhead")
        
        @component()
        def simple_op(x: int) -> namedtuple:
            Output = namedtuple('Output', ['result'])
            return Output(result=x + 1)
        
        # Create chain of different lengths
        chain_lengths = [1, 10, 50, 100]
        
        for length in chain_lengths:
            start = time.time()
            
            result = simple_op(0)
            for i in range(1, length):
                result = simple_op(i, parent_hash=result['hash'])
            
            duration = time.time() - start
            results.add_result(duration)
            
            print(f"Chain length {length}: {duration:.4f}s")
        
        results.save_results(benchmark_dir / "graph_recording.json")
        
        # Overhead should be linear
        if len(results.results) > 1:
            # Calculate overhead per operation
            overhead_per_op = (results.results[-1] - results.results[0]) / (chain_lengths[-1] - chain_lengths[0])
            print(f"Overhead per operation: {overhead_per_op * 1000:.2f}ms")
            
            # Should be minimal
            assert overhead_per_op < 0.01  # Less than 10ms per op


class TestMemoryPerformance:
    """Test memory usage patterns."""
    
    def test_large_data_handling(self, benchmark_dir):
        """Test handling of large data objects."""
        results = BenchmarkResults("large_data_handling")
        
        @component()
        def process_large_data(size_mb: int) -> namedtuple:
            # Create large data structure
            data = bytearray(size_mb * 1024 * 1024)
            
            # Simple processing
            checksum = sum(data) % 256
            
            Output = namedtuple('Output', ['checksum', 'size_mb'])
            return Output(checksum=checksum, size_mb=size_mb)
        
        sizes = [1, 10, 50, 100]  # MB
        
        for size in sizes:
            start = time.time()
            result = process_large_data(size)
            duration = time.time() - start
            
            results.add_result(duration)
            print(f"Data size {size}MB: {duration:.4f}s")
        
        results.save_results(benchmark_dir / "large_data.json")


def generate_benchmark_report(benchmark_dir: str):
    """Generate a comprehensive benchmark report."""
    report = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'benchmarks': {}
    }
    
    # Load all benchmark results
    for filename in os.listdir(benchmark_dir):
        if filename.endswith('.json'):
            with open(os.path.join(benchmark_dir, filename), 'r') as f:
                data = json.load(f)
                report['benchmarks'][data['name']] = data['statistics']
    
    # Add system info
    import platform
    report['system'] = {
        'platform': platform.platform(),
        'processor': platform.processor(),
        'python_version': platform.python_version()
    }
    
    # Save report
    with open(os.path.join(benchmark_dir, 'benchmark_report.json'), 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print("\n" + "="*60)
    print("BENCHMARK SUMMARY")
    print("="*60)
    
    for name, stats in report['benchmarks'].items():
        print(f"\n{name}:")
        print(f"  Mean: {stats.get('mean', 0):.4f}s")
        print(f"  Min:  {stats.get('min', 0):.4f}s")
        print(f"  Max:  {stats.get('max', 0):.4f}s")
        print(f"  Samples: {stats.get('samples', 0)}")


if __name__ == '__main__':
    # Run benchmarks
    pytest.main([__file__, '-v', '--tb=short'])
    
    # Generate report
    # generate_benchmark_report('./benchmarks')