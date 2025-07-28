"""
Unit tests for TwinGraph executors.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, call
from collections import namedtuple
import json
import time

from twingraph.orchestration.executor import ComponentExecutor, PipelineExecutor
from twingraph.orchestration.decorators import ComponentMetadata, ComputePlatform
from twingraph.orchestration.config import ComponentConfig, PipelineConfig
from twingraph.core.exceptions import ComponentExecutionError, PipelineExecutionError


class TestComponentExecutor:
    """Test ComponentExecutor functionality."""
    
    @pytest.fixture
    def sample_metadata(self):
        """Create sample component metadata."""
        return ComponentMetadata(
            name='test_component',
            signature=Mock(),
            source_code='def test_component(): pass',
            file_path='/test/file.py',
            line_number=10,
            platform=ComputePlatform.LOCAL,
            config=ComponentConfig()
        )
    
    @pytest.fixture
    def executor(self, sample_metadata):
        """Create component executor instance."""
        with patch('twingraph.orchestration.executor.GraphManager'):
            return ComponentExecutor(
                metadata=sample_metadata,
                graph_config={},
                additional_attributes={},
                git_tracking=False
            )
    
    def test_executor_initialization(self, executor, sample_metadata):
        """Test executor initialization."""
        assert executor.metadata == sample_metadata
        assert executor.graph_config == {}
        assert executor.additional_attributes == {}
        assert executor.git_tracking is False
    
    def test_local_execution(self, executor):
        """Test local component execution."""
        def test_func(a, b):
            Output = namedtuple('Output', ['sum'])
            return Output(sum=a + b)
        
        result = executor.execute(test_func, (2, 3), {})
        
        assert 'outputs' in result
        assert 'hash' in result
        assert result['outputs']['sum'] == 5
        assert result['component'] == 'test_component'
    
    def test_execution_with_parent_hash(self, executor):
        """Test execution with parent hash."""
        def test_func(value):
            Output = namedtuple('Output', ['doubled'])
            return Output(doubled=value * 2)
        
        result = executor.execute(
            test_func,
            (5,),
            {'parent_hash': ['parent123', 'parent456']}
        )
        
        assert result['outputs']['doubled'] == 10
        
        # Verify parent hashes were processed
        graph_calls = executor.graph_manager.add_component_execution.call_args_list
        assert len(graph_calls) == 1
        assert graph_calls[0][0][1] == ['parent123', 'parent456']
    
    def test_execution_error_handling(self, executor):
        """Test error handling during execution."""
        def failing_func():
            raise ValueError("Test error")
        
        with pytest.raises(ComponentExecutionError) as exc_info:
            executor.execute(failing_func, (), {})
        
        assert "Test error" in str(exc_info.value)
        assert exc_info.value.details['component_name'] == 'test_component'
    
    @patch('twingraph.orchestration.executor.time.sleep')
    def test_retry_logic(self, mock_sleep, sample_metadata):
        """Test retry logic for failing components."""
        # Configure with retries
        sample_metadata.config.auto_retry = True
        sample_metadata.config.max_retries = 3
        
        executor = ComponentExecutor(
            metadata=sample_metadata,
            graph_config={},
            additional_attributes={},
            git_tracking=False
        )
        
        # Function that fails first 2 times
        call_count = 0
        def flaky_func():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError(f"Attempt {call_count} failed")
            Output = namedtuple('Output', ['result'])
            return Output(result='success')
        
        with patch.object(executor, 'graph_manager'):
            result = executor.execute(flaky_func, (), {})
        
        assert result['outputs']['result'] == 'success'
        assert call_count == 3
        assert mock_sleep.call_count == 2
    
    def test_input_serialization(self, executor):
        """Test input serialization."""
        # Mock signature binding
        bound_args = Mock()
        bound_args.arguments = {
            'a': [1, 2, 3],
            'b': {'key': 'value'},
            'c': 'string'
        }
        
        executor.metadata.signature.bind.return_value = bound_args
        bound_args.apply_defaults.return_value = None
        
        serialized = executor._serialize_inputs((1, 2), {'c': 'test'})
        
        assert serialized == {
            'a': [1, 2, 3],
            'b': {'key': 'value'},
            'c': 'string'
        }
    
    @patch('twingraph.orchestration.executor.DockerExecutor')
    def test_docker_platform_execution(self, mock_docker_class, sample_metadata):
        """Test Docker platform execution."""
        sample_metadata.platform = ComputePlatform.DOCKER
        sample_metadata.config.docker_image = 'python:3.9'
        
        mock_docker = Mock()
        mock_docker.execute.return_value = {'result': 'docker_output'}
        mock_docker_class.return_value = mock_docker
        
        executor = ComponentExecutor(
            metadata=sample_metadata,
            graph_config={},
            additional_attributes={},
            git_tracking=False
        )
        
        def test_func():
            pass
        
        with patch.object(executor, '_process_result') as mock_process:
            with patch.object(executor, '_record_execution'):
                mock_process.return_value = {'outputs': {'result': 'processed'}}
                
                result = executor.execute(test_func, (), {})
        
        mock_docker.execute.assert_called_once()
        assert result['outputs']['result'] == 'processed'


class TestPipelineExecutor:
    """Test PipelineExecutor functionality."""
    
    @pytest.fixture
    def pipeline_config(self):
        """Create sample pipeline configuration."""
        return PipelineConfig(
            name='test_pipeline',
            celery_enabled=False,
            monitoring_enabled=True
        )
    
    @pytest.fixture
    def executor(self, pipeline_config):
        """Create pipeline executor instance."""
        with patch('twingraph.orchestration.executor.GraphManager'):
            return PipelineExecutor(
                config=pipeline_config,
                graph_config={},
                clear_graph=True
            )
    
    def test_executor_initialization(self, executor, pipeline_config):
        """Test pipeline executor initialization."""
        assert executor.config == pipeline_config
        assert executor.clear_graph is True
    
    def test_local_pipeline_execution(self, executor):
        """Test local pipeline execution."""
        def test_pipeline():
            return {'result': 'completed'}
        
        with patch.object(executor.graph_manager, 'clear_graph'):
            result = executor.execute(test_pipeline, (), {})
        
        assert result == {'result': 'completed'}
        executor.graph_manager.clear_graph.assert_called_once()
    
    def test_pipeline_error_handling(self, executor):
        """Test pipeline error handling."""
        def failing_pipeline():
            raise RuntimeError("Pipeline failed")
        
        with pytest.raises(PipelineExecutionError) as exc_info:
            executor.execute(failing_pipeline, (), {})
        
        assert "Pipeline failed" in str(exc_info.value)
        assert exc_info.value.details['pipeline_name'] == 'test_pipeline'
    
    def test_pipeline_monitoring(self, executor):
        """Test pipeline monitoring context."""
        logs = []
        
        def mock_log(msg):
            logs.append(msg)
        
        with patch('twingraph.orchestration.executor.logger.info', mock_log):
            with patch('twingraph.orchestration.executor.logger.error', mock_log):
                
                def monitored_pipeline():
                    return "success"
                
                result = executor.execute(monitored_pipeline, (), {})
                
                assert result == "success"
                assert any("Starting pipeline test_pipeline" in log for log in logs)
                assert any("completed" in log for log in logs)
    
    def test_pipeline_recording(self, executor):
        """Test pipeline execution recording."""
        def test_pipeline():
            return "done"
        
        with patch.object(executor, '_record_pipeline_start') as mock_start:
            with patch.object(executor, '_record_pipeline_completion') as mock_end:
                
                result = executor.execute(test_pipeline, (), {})
                
                assert result == "done"
                mock_start.assert_called_once()
                mock_end.assert_called_once()
                
                # Check completion was called with success=True
                end_call = mock_end.call_args
                assert end_call[0][2] is True  # success parameter
    
    @pytest.mark.skip(reason="Celery integration not yet implemented")
    def test_distributed_pipeline_execution(self, pipeline_config):
        """Test distributed pipeline execution with Celery."""
        pipeline_config.celery_enabled = True
        
        executor = PipelineExecutor(
            config=pipeline_config,
            graph_config={},
            clear_graph=False
        )
        
        # This would test Celery integration
        pass


class TestPlatformExecutors:
    """Test platform-specific executors."""
    
    def test_docker_executor_script_generation(self):
        """Test Docker executor script generation."""
        from twingraph.orchestration.platforms import DockerExecutor
        
        config = ComponentConfig(docker_image='python:3.9')
        executor = DockerExecutor(config)
        
        def test_func(a, b):
            return a + b
        
        script = executor._create_execution_script(
            test_func,
            (1, 2),
            {}
        )
        
        assert 'def test_func(a, b):' in script
        assert 'return a + b' in script
        assert 'json.dumps' in script
    
    @patch('docker.from_env')
    def test_docker_execution(self, mock_docker_from_env):
        """Test Docker container execution."""
        from twingraph.orchestration.platforms import DockerExecutor
        
        # Mock Docker client
        mock_client = Mock()
        mock_container_output = json.dumps({'result': 42})
        mock_client.containers.run.return_value = mock_container_output.encode()
        mock_docker_from_env.return_value = mock_client
        
        config = ComponentConfig(docker_image='python:3.9')
        executor = DockerExecutor(config)
        
        def test_func():
            return 42
        
        result = executor.execute(
            test_func,
            (),
            {},
            {'execution_id': 'test123', 'component_name': 'test'}
        )
        
        assert result == {'result': 42}
        mock_client.containers.run.assert_called_once()
    
    def test_kubernetes_executor_initialization(self):
        """Test Kubernetes executor initialization."""
        from twingraph.orchestration.platforms import KubernetesExecutor
        
        config = ComponentConfig(
            platform_config={'namespace': 'test-namespace'}
        )
        
        with patch('twingraph.orchestration.platforms.k8s_config'):
            with patch('twingraph.orchestration.platforms.client'):
                executor = KubernetesExecutor(config)
                assert executor.config == config


class TestHelperMethods:
    """Test helper methods in executors."""
    
    def test_execution_id_generation(self, executor):
        """Test execution ID generation."""
        with patch('time.time', return_value=1234567890):
            exec_id = executor._generate_execution_id()
            
            assert isinstance(exec_id, str)
            assert len(exec_id) == 16
    
    def test_result_processing(self, executor):
        """Test result processing."""
        # NamedTuple result
        Output = namedtuple('Output', ['value'])
        result = Output(value=42)
        
        processed = executor._process_result(result, 'exec123')
        
        assert processed['outputs'] == {'value': 42}
        assert processed['hash'] == 'exec123'
        assert processed['component'] == 'test_component'
        
        # Dict result
        dict_result = {'key': 'value'}
        processed = executor._process_result(dict_result, 'exec456')
        
        assert processed['outputs'] == {'key': 'value'}
        
        # Other result
        processed = executor._process_result(100, 'exec789')
        assert processed['outputs'] == {'result': 100}
    
    @patch('git.Repo')
    def test_git_attributes(self, mock_repo_class, executor):
        """Test git attribute extraction."""
        executor.git_tracking = True
        
        # Mock git repo
        mock_repo = Mock()
        mock_commit = Mock()
        mock_commit.hexsha = 'abc123'
        mock_commit.author = 'Test Author'
        mock_commit.message = 'Test commit message'
        
        mock_repo.head.commit = mock_commit
        mock_repo.active_branch.name = 'main'
        mock_repo_class.return_value = mock_repo
        
        attrs = executor._get_git_attributes()
        
        assert attrs['GitCommit'] == 'abc123'
        assert attrs['GitBranch'] == 'main'
        assert attrs['GitAuthor'] == 'Test Author'
        assert attrs['GitMessage'] == 'Test commit message'