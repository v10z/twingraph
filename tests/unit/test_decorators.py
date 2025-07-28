"""
Unit tests for TwinGraph decorators.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from collections import namedtuple

from twingraph.orchestration.decorators import component, pipeline, ComputePlatform
from twingraph.core.exceptions import TwinGraphError, ComponentExecutionError


class TestComponentDecorator:
    """Test component decorator functionality."""
    
    def test_basic_component(self):
        """Test basic component decoration."""
        @component()
        def add_numbers(a: float, b: float) -> namedtuple:
            Output = namedtuple('Output', ['sum'])
            return Output(sum=a + b)
        
        # Check decoration
        assert hasattr(add_numbers, '_twingraph_metadata')
        assert add_numbers._is_twingraph_component is True
        
        # Check metadata
        metadata = add_numbers._twingraph_metadata
        assert metadata.name == 'add_numbers'
        assert metadata.platform == ComputePlatform.LOCAL
    
    def test_component_with_platform(self):
        """Test component with specific platform."""
        @component(platform="docker", docker_image="python:3.9")
        def process_data(data: list) -> namedtuple:
            Output = namedtuple('Output', ['result'])
            return Output(result=len(data))
        
        metadata = process_data._twingraph_metadata
        assert metadata.platform == ComputePlatform.DOCKER
        assert metadata.config.docker_image == "python:3.9"
    
    def test_component_with_config(self):
        """Test component with configuration."""
        config = {
            'timeout': 300,
            'memory': '1GB'
        }
        
        @component(
            platform="kubernetes",
            config=config,
            auto_retry=False,
            max_retries=5
        )
        def complex_process(input_data: dict) -> namedtuple:
            Output = namedtuple('Output', ['processed'])
            return Output(processed=True)
        
        metadata = complex_process._twingraph_metadata
        assert metadata.config.auto_retry is False
        assert metadata.config.max_retries == 5
        assert metadata.config.platform_config == config
    
    @patch('twingraph.orchestration.executor.ComponentExecutor')
    def test_component_execution(self, mock_executor_class):
        """Test component execution flow."""
        mock_executor = Mock()
        mock_executor.execute.return_value = {'outputs': {'sum': 5}, 'hash': 'abc123'}
        mock_executor_class.return_value = mock_executor
        
        @component()
        def add(a: int, b: int) -> namedtuple:
            Output = namedtuple('Output', ['sum'])
            return Output(sum=a + b)
        
        result = add(2, 3)
        
        # Verify executor was called
        mock_executor.execute.assert_called_once()
        assert result == {'outputs': {'sum': 5}, 'hash': 'abc123'}
    
    def test_component_with_parent_hash(self):
        """Test component with parent hash."""
        @component()
        def child_component(value: int, parent_hash: str = None) -> namedtuple:
            Output = namedtuple('Output', ['doubled'])
            return Output(doubled=value * 2)
        
        # Should handle parent_hash transparently
        with patch('twingraph.orchestration.executor.ComponentExecutor') as mock:
            mock_instance = Mock()
            mock_instance.execute.return_value = {
                'outputs': {'doubled': 10},
                'hash': 'child123'
            }
            mock.return_value = mock_instance
            
            result = child_component(5, parent_hash='parent123')
            assert result['outputs']['doubled'] == 10


class TestPipelineDecorator:
    """Test pipeline decorator functionality."""
    
    def test_basic_pipeline(self):
        """Test basic pipeline decoration."""
        @pipeline()
        def ml_pipeline():
            return "completed"
        
        # Check decoration
        assert hasattr(ml_pipeline, '_twingraph_pipeline')
        assert ml_pipeline._twingraph_pipeline is True
        
        # Check config
        config = ml_pipeline._pipeline_config
        assert config.name == 'ml_pipeline'
        assert config.celery_enabled is False
    
    def test_pipeline_with_celery(self):
        """Test pipeline with Celery configuration."""
        celery_config = {
            'broker_url': 'redis://custom:6379/1',
            'task_timeout': 7200
        }
        
        @pipeline(
            name="distributed_pipeline",
            celery_enabled=True,
            celery_config=celery_config,
            distributed=True
        )
        def distributed_workflow():
            pass
        
        config = distributed_workflow._pipeline_config
        assert config.name == "distributed_pipeline"
        assert config.celery_enabled is True
        assert config.distributed is True
        assert config.celery_config == celery_config
    
    @patch('twingraph.orchestration.executor.PipelineExecutor')
    def test_pipeline_execution(self, mock_executor_class):
        """Test pipeline execution flow."""
        mock_executor = Mock()
        mock_executor.execute.return_value = "pipeline_result"
        mock_executor_class.return_value = mock_executor
        
        @pipeline(clear_graph=False)
        def test_pipeline():
            return "test"
        
        result = test_pipeline()
        
        # Verify executor was called
        mock_executor.execute.assert_called_once()
        assert result == "pipeline_result"
    
    def test_pipeline_with_monitoring(self):
        """Test pipeline with monitoring enabled."""
        @pipeline(monitoring_enabled=True)
        def monitored_pipeline():
            pass
        
        config = monitored_pipeline._pipeline_config
        assert config.monitoring_enabled is True


class TestIntegration:
    """Test integration between components and pipelines."""
    
    @patch('twingraph.orchestration.executor.ComponentExecutor')
    def test_component_in_pipeline(self, mock_component_executor):
        """Test using components within a pipeline."""
        # Setup component mocks
        mock_executor = Mock()
        mock_executor.execute.side_effect = [
            {'outputs': {'sum': 5}, 'hash': 'hash1'},
            {'outputs': {'product': 10}, 'hash': 'hash2'}
        ]
        mock_component_executor.return_value = mock_executor
        
        @component()
        def add(a: int, b: int) -> namedtuple:
            Output = namedtuple('Output', ['sum'])
            return Output(sum=a + b)
        
        @component()
        def multiply(a: int, b: int) -> namedtuple:
            Output = namedtuple('Output', ['product'])
            return Output(product=a * b)
        
        @pipeline()
        def math_pipeline():
            result1 = add(2, 3)
            result2 = multiply(result1['outputs']['sum'], 2)
            return result2
        
        with patch('twingraph.orchestration.executor.PipelineExecutor') as mock_pipeline:
            mock_pipeline_executor = Mock()
            mock_pipeline_executor.execute.return_value = {
                'outputs': {'product': 10},
                'hash': 'hash2'
            }
            mock_pipeline.return_value = mock_pipeline_executor
            
            result = math_pipeline()
            assert result['outputs']['product'] == 10
    
    def test_invalid_component_signature(self):
        """Test component with invalid signature."""
        with pytest.raises(TwinGraphError):
            @component()
            def invalid_component(a: int) -> int:  # Should return NamedTuple
                return a * 2


class TestErrorHandling:
    """Test error handling in decorators."""
    
    @patch('twingraph.orchestration.executor.ComponentExecutor')
    def test_component_execution_error(self, mock_executor_class):
        """Test component execution error handling."""
        mock_executor = Mock()
        mock_executor.execute.side_effect = ComponentExecutionError(
            "Execution failed",
            component_name="test_component"
        )
        mock_executor_class.return_value = mock_executor
        
        @component()
        def failing_component(value: int) -> namedtuple:
            Output = namedtuple('Output', ['result'])
            return Output(result=value)
        
        with pytest.raises(ComponentExecutionError) as exc_info:
            failing_component(42)
        
        assert "Execution failed" in str(exc_info.value)
        assert exc_info.value.details['component_name'] == "test_component"
    
    def test_component_with_timeout(self):
        """Test component with timeout configuration."""
        @component(timeout=30)
        def slow_component(data: list) -> namedtuple:
            Output = namedtuple('Output', ['processed'])
            return Output(processed=len(data))
        
        metadata = slow_component._twingraph_metadata
        assert metadata.config.timeout == 30


class TestAdvancedFeatures:
    """Test advanced decorator features."""
    
    def test_component_with_git_tracking(self):
        """Test component with git tracking enabled."""
        @component(git_tracking=True)
        def tracked_component(x: int) -> namedtuple:
            Output = namedtuple('Output', ['result'])
            return Output(result=x * 2)
        
        # Git tracking should be handled by executor
        assert tracked_component._twingraph_metadata
    
    def test_component_with_additional_attributes(self):
        """Test component with additional attributes."""
        attributes = {
            'team': 'ml-team',
            'project': 'recommendation-engine',
            'version': '1.2.3'
        }
        
        @component(additional_attributes=attributes)
        def ml_component(features: list) -> namedtuple:
            Output = namedtuple('Output', ['predictions'])
            return Output(predictions=[])
        
        # Attributes should be passed to executor
        with patch('twingraph.orchestration.executor.ComponentExecutor') as mock:
            mock_instance = Mock()
            mock.return_value = mock_instance
            
            # Access the decorator to trigger initialization
            _ = ml_component._twingraph_metadata
            
            # Verify attributes were passed
            call_kwargs = mock.call_args[1]
            assert call_kwargs['additional_attributes'] == attributes
    
    def test_nested_namedtuples(self):
        """Test component returning nested namedtuples."""
        @component()
        def complex_component(data: dict) -> namedtuple:
            InnerOutput = namedtuple('InnerOutput', ['value', 'metadata'])
            Output = namedtuple('Output', ['result', 'inner'])
            
            inner = InnerOutput(value=42, metadata={'processed': True})
            return Output(result='success', inner=inner)
        
        # Should handle nested structures
        assert complex_component._twingraph_metadata.name == 'complex_component'