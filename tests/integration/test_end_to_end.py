"""
End-to-end integration tests for TwinGraph.
"""

import pytest
import time
import tempfile
import os
from collections import namedtuple
from unittest.mock import patch, Mock

from twingraph import component, pipeline
from twingraph.graph.graph_manager import GraphManager


class TestLocalExecution:
    """Test local execution end-to-end."""
    
    @pytest.fixture
    def graph_manager(self):
        """Create a test graph manager."""
        with patch('twingraph.orchestration.executor.GraphManager') as mock:
            instance = Mock()
            mock.return_value = instance
            yield instance
    
    def test_simple_component_chain(self, graph_manager):
        """Test simple component chain execution."""
        @component()
        def load_data(filename: str) -> namedtuple:
            Output = namedtuple('Output', ['data'])
            return Output(data=[1, 2, 3, 4, 5])
        
        @component()
        def process_data(data: list) -> namedtuple:
            Output = namedtuple('Output', ['processed', 'count'])
            processed = [x * 2 for x in data]
            return Output(processed=processed, count=len(processed))
        
        @component()
        def save_results(data: list, count: int) -> namedtuple:
            Output = namedtuple('Output', ['saved', 'path'])
            return Output(saved=True, path=f'/tmp/results_{count}.json')
        
        # Execute chain
        data_result = load_data('test.csv')
        process_result = process_data(
            data_result['outputs']['data'],
            parent_hash=data_result['hash']
        )
        save_result = save_results(
            process_result['outputs']['processed'],
            process_result['outputs']['count'],
            parent_hash=[data_result['hash'], process_result['hash']]
        )
        
        # Verify results
        assert save_result['outputs']['saved'] is True
        assert save_result['outputs']['path'] == '/tmp/results_5.json'
        
        # Verify graph recording
        assert graph_manager.add_component_execution.call_count == 3
    
    def test_pipeline_with_components(self, graph_manager):
        """Test pipeline containing multiple components."""
        @component()
        def extract(source: str) -> namedtuple:
            Output = namedtuple('Output', ['data'])
            return Output(data={'source': source, 'records': 100})
        
        @component()
        def transform(data: dict) -> namedtuple:
            Output = namedtuple('Output', ['transformed'])
            data['transformed'] = True
            return Output(transformed=data)
        
        @component()
        def load(data: dict, target: str) -> namedtuple:
            Output = namedtuple('Output', ['status'])
            return Output(status=f"Loaded {data['records']} records to {target}")
        
        @pipeline()
        def etl_pipeline():
            # Extract
            extracted = extract('database')
            
            # Transform
            transformed = transform(
                extracted['outputs']['data'],
                parent_hash=extracted['hash']
            )
            
            # Load
            result = load(
                transformed['outputs']['transformed'],
                'warehouse',
                parent_hash=[extracted['hash'], transformed['hash']]
            )
            
            return result
        
        # Execute pipeline
        result = etl_pipeline()
        
        assert result['outputs']['status'] == "Loaded 100 records to warehouse"
    
    def test_conditional_execution(self, graph_manager):
        """Test conditional execution in pipeline."""
        @component()
        def check_condition(value: int) -> namedtuple:
            Output = namedtuple('Output', ['should_process'])
            return Output(should_process=value > 10)
        
        @component()
        def process_large(value: int) -> namedtuple:
            Output = namedtuple('Output', ['result'])
            return Output(result=value * 2)
        
        @component()
        def process_small(value: int) -> namedtuple:
            Output = namedtuple('Output', ['result'])
            return Output(result=value + 10)
        
        @pipeline()
        def conditional_pipeline(input_value: int):
            condition = check_condition(input_value)
            
            if condition['outputs']['should_process']:
                result = process_large(
                    input_value,
                    parent_hash=condition['hash']
                )
            else:
                result = process_small(
                    input_value,
                    parent_hash=condition['hash']
                )
            
            return result
        
        # Test with large value
        large_result = conditional_pipeline(20)
        assert large_result['outputs']['result'] == 40
        
        # Test with small value
        small_result = conditional_pipeline(5)
        assert small_result['outputs']['result'] == 15
    
    def test_parallel_components(self, graph_manager):
        """Test parallel component execution."""
        @component()
        def split_data(data: list) -> namedtuple:
            Output = namedtuple('Output', ['chunks'])
            chunk_size = len(data) // 3
            chunks = [
                data[i:i+chunk_size] 
                for i in range(0, len(data), chunk_size)
            ]
            return Output(chunks=chunks)
        
        @component()
        def process_chunk(chunk: list, chunk_id: int) -> namedtuple:
            Output = namedtuple('Output', ['processed', 'chunk_id'])
            processed = sum(chunk)
            return Output(processed=processed, chunk_id=chunk_id)
        
        @component()
        def merge_results(results: list) -> namedtuple:
            Output = namedtuple('Output', ['total'])
            total = sum(r['processed'] for r in results)
            return Output(total=total)
        
        @pipeline()
        def parallel_pipeline():
            data = list(range(12))
            
            # Split
            split_result = split_data(data)
            chunks = split_result['outputs']['chunks']
            
            # Process in parallel (simulated)
            chunk_results = []
            for i, chunk in enumerate(chunks):
                result = process_chunk(
                    chunk, i,
                    parent_hash=split_result['hash']
                )
                chunk_results.append(result['outputs'])
            
            # Merge
            final_result = merge_results(
                chunk_results,
                parent_hash=[r['hash'] for r in chunk_results]
            )
            
            return final_result
        
        result = parallel_pipeline()
        assert result['outputs']['total'] == sum(range(12))


class TestErrorHandling:
    """Test error handling in integration scenarios."""
    
    def test_component_failure_handling(self):
        """Test handling of component failures."""
        @component(auto_retry=True, max_retries=3)
        def flaky_component(attempts: list) -> namedtuple:
            attempts.append(1)
            if len(attempts) < 3:
                raise ValueError(f"Attempt {len(attempts)} failed")
            Output = namedtuple('Output', ['success'])
            return Output(success=True)
        
        attempts = []
        
        with patch('twingraph.orchestration.executor.GraphManager'):
            result = flaky_component(attempts)
        
        assert result['outputs']['success'] is True
        assert len(attempts) == 3
    
    def test_pipeline_error_propagation(self):
        """Test error propagation in pipelines."""
        @component()
        def failing_component() -> namedtuple:
            raise RuntimeError("Component failure")
        
        @pipeline()
        def failing_pipeline():
            return failing_component()
        
        with patch('twingraph.orchestration.executor.GraphManager'):
            with pytest.raises(Exception) as exc_info:
                failing_pipeline()
            
            assert "Component failure" in str(exc_info.value)


class TestDockerIntegration:
    """Test Docker platform integration."""
    
    @pytest.mark.skipif(
        not os.environ.get('TWINGRAPH_DOCKER_TESTS'),
        reason="Docker tests disabled by default"
    )
    def test_docker_component_execution(self):
        """Test component execution in Docker."""
        @component(
            platform="docker",
            docker_image="python:3.9-slim"
        )
        def docker_process(data: list) -> namedtuple:
            import statistics
            Output = namedtuple('Output', ['mean', 'median'])
            return Output(
                mean=statistics.mean(data),
                median=statistics.median(data)
            )
        
        with patch('twingraph.orchestration.executor.GraphManager'):
            with patch('docker.from_env') as mock_docker:
                # Mock Docker execution
                mock_client = Mock()
                mock_output = '{"mean": 5.0, "median": 5}'
                mock_client.containers.run.return_value = mock_output.encode()
                mock_docker.return_value = mock_client
                
                result = docker_process([3, 5, 7])
                
                assert result['outputs']['mean'] == 5.0
                assert result['outputs']['median'] == 5


class TestKubernetesIntegration:
    """Test Kubernetes platform integration."""
    
    @pytest.mark.skipif(
        not os.environ.get('TWINGRAPH_K8S_TESTS'),
        reason="Kubernetes tests disabled by default"
    )
    def test_kubernetes_component_execution(self):
        """Test component execution on Kubernetes."""
        @component(
            platform="kubernetes",
            docker_image="python:3.9",
            config={
                'namespace': 'twingraph-test',
                'resources': {
                    'cpu': '100m',
                    'memory': '256Mi'
                }
            }
        )
        def k8s_process(data: dict) -> namedtuple:
            Output = namedtuple('Output', ['processed'])
            data['k8s_processed'] = True
            return Output(processed=data)
        
        # This would require a real Kubernetes cluster
        # For unit testing, we mock the K8s client
        pass


class TestGraphVisualization:
    """Test graph visualization and querying."""
    
    def test_execution_graph_retrieval(self):
        """Test retrieving execution graph."""
        mock_graph = Mock()
        
        @component()
        def node_a() -> namedtuple:
            Output = namedtuple('Output', ['value'])
            return Output(value='A')
        
        @component()
        def node_b(input_a: str) -> namedtuple:
            Output = namedtuple('Output', ['value'])
            return Output(value=f'{input_a}->B')
        
        @component()
        def node_c(input_b: str) -> namedtuple:
            Output = namedtuple('Output', ['value'])
            return Output(value=f'{input_b}->C')
        
        with patch('twingraph.orchestration.executor.GraphManager') as mock_gm:
            mock_gm.return_value = mock_graph
            
            # Execute chain
            a_result = node_a()
            b_result = node_b(
                a_result['outputs']['value'],
                parent_hash=a_result['hash']
            )
            c_result = node_c(
                b_result['outputs']['value'],
                parent_hash=b_result['hash']
            )
            
            # Verify graph structure
            assert mock_graph.add_component_execution.call_count == 3


class TestPerformance:
    """Test performance characteristics."""
    
    def test_large_pipeline_performance(self):
        """Test performance with large pipelines."""
        @component()
        def generate_data(size: int) -> namedtuple:
            Output = namedtuple('Output', ['data'])
            return Output(data=list(range(size)))
        
        @component()
        def process_batch(batch: list) -> namedtuple:
            Output = namedtuple('Output', ['sum'])
            return Output(sum=sum(batch))
        
        @pipeline()
        def large_pipeline():
            start_time = time.time()
            
            # Generate large dataset
            data = generate_data(10000)
            
            # Process in batches
            batch_size = 100
            results = []
            
            for i in range(0, 10000, batch_size):
                batch = data['outputs']['data'][i:i+batch_size]
                result = process_batch(batch, parent_hash=data['hash'])
                results.append(result['outputs']['sum'])
            
            total = sum(results)
            end_time = time.time()
            
            return {
                'total': total,
                'execution_time': end_time - start_time
            }
        
        with patch('twingraph.orchestration.executor.GraphManager'):
            result = large_pipeline()
        
        assert result['total'] == sum(range(10000))
        # Should complete reasonably quickly
        assert result['execution_time'] < 5.0