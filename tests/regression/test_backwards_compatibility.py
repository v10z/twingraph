"""
Regression tests to ensure backwards compatibility with existing TwinGraph code.
"""

import pytest
import os
import sys
from collections import namedtuple
from unittest.mock import patch, Mock

# Add twingraph to path for testing
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from twingraph import component, pipeline


class TestBackwardsCompatibility:
    """Test that existing TwinGraph code continues to work."""
    
    def test_original_component_syntax(self):
        """Test original component decorator syntax."""
        # Original syntax from demo_1
        @component()
        def Func_A_add(input_1: float, input_2: float) -> NamedTuple:
            output_1 = input_1 + input_2
            from collections import namedtuple
            outputs_namedtuple = namedtuple('outputs', ['sum'])
            return outputs_namedtuple(output_1)
        
        with patch('twingraph.orchestration.executor.GraphManager'):
            result = Func_A_add(3.14159, 1)
            
            assert 'outputs' in result
            assert 'hash' in result
            assert result['outputs']['sum'] == 4.14159
    
    def test_original_pipeline_syntax(self):
        """Test original pipeline decorator syntax."""
        @component()
        def Func_B_multiply(input_1: float, input_2: float) -> NamedTuple:
            import numpy as np
            output_1 = np.multiply(input_1, input_2)
            from collections import namedtuple
            outputs = namedtuple('outputs', ['multiplication'])
            return outputs(output_1)
        
        @pipeline()
        def test_orchestration():
            import random
            
            float_number_1 = 3.14159
            float_number_2 = 1
            
            func_A = Func_A_add(float_number_2, input_1=float_number_1)
            
            func_B = Func_B_multiply(
                float_number_1, 
                func_A['outputs']['sum'], 
                parent_hash=func_A['hash']
            )
            
            return func_B
        
        with patch('twingraph.orchestration.executor.GraphManager'):
            result = test_orchestration()
            
            assert 'outputs' in result
            assert 'multiplication' in result['outputs']
    
    def test_docker_component_syntax(self):
        """Test Docker component syntax from demo_2."""
        @component(docker_id='python:3.8')
        def Func_A_docker_add(input_1: float, input_2: float) -> NamedTuple:
            output_1 = input_1 + input_2
            from collections import namedtuple
            outputs = namedtuple('outputs', ['sum'])
            return outputs(output_1)
        
        # Docker_id should map to docker_image
        assert hasattr(Func_A_docker_add, '_twingraph_metadata')
        metadata = Func_A_docker_add._twingraph_metadata
        assert metadata.config.docker_image == 'python:3.8'
    
    def test_batch_component_syntax(self):
        """Test AWS Batch component syntax."""
        batch_config = {
            "region_name": "us-east-1",
            "jobQueue": "twingraph-run-queue",
            "logGroupName": "/aws/batch/job",
            "vCPU": 1,
            "Mem": 2048
        }
        
        @component(
            batch_task=True,
            docker_id='123456789012.dkr.ecr.us-east-1.amazonaws.com/twingraph-demo',
            batch_config=batch_config
        )
        def Func_batch(input_1: float, input_2: float) -> NamedTuple:
            output_1 = input_1 + input_2
            from collections import namedtuple
            outputs = namedtuple('outputs', ['sum'])
            return outputs(output_1)
        
        metadata = Func_batch._twingraph_metadata
        assert metadata.platform.value == 'batch'
        assert metadata.config.batch_config == batch_config
    
    def test_kubernetes_component_syntax(self):
        """Test Kubernetes component syntax."""
        kube_config = {
            "pull_policy": "Always",
            "namespace": "default",
            "timeout": "360000"
        }
        
        @component(
            kubernetes_task=True,
            docker_id='k8s.gcr.io/echoserver:1.4',
            kube_config=kube_config
        )
        def Func_k8s(input_1: str) -> NamedTuple:
            from collections import namedtuple
            outputs = namedtuple('outputs', ['echo'])
            return outputs(f"Echo: {input_1}")
        
        metadata = Func_k8s._twingraph_metadata
        assert metadata.platform.value == 'kubernetes'
    
    def test_lambda_component_syntax(self):
        """Test AWS Lambda component syntax."""
        lambda_config = {
            "iam_role": "arn:aws:iam::123456789012:role/lambda-role",
            "architecture": "x86_64",
            "storage_size": 512,
            "region_name": "us-east-1",
            "timeout": 900
        }
        
        @component(
            lambda_task=True,
            lambda_config=lambda_config
        )
        def Func_lambda(input_1: dict) -> NamedTuple:
            from collections import namedtuple
            outputs = namedtuple('outputs', ['processed'])
            return outputs(True)
        
        metadata = Func_lambda._twingraph_metadata
        assert metadata.platform.value == 'lambda'
        assert metadata.config.lambda_config == lambda_config
    
    def test_celery_pipeline_syntax(self):
        """Test Celery pipeline syntax."""
        @pipeline(
            celery_pipeline=True,
            celery_concurrency_threads=16,
            celery_backend='redis://localhost:6379/0',
            celery_broker='redis://localhost:6379/1'
        )
        def celery_test_pipeline():
            pass
        
        config = celery_test_pipeline._pipeline_config
        assert config.celery_enabled is True
        assert config.celery_concurrency == 16
        assert config.celery_backend == 'redis://localhost:6379/0'
        assert config.celery_broker == 'redis://localhost:6379/1'
    
    def test_git_data_component(self):
        """Test component with git data tracking."""
        @component(git_data=True)
        def git_tracked_component(x: int) -> NamedTuple:
            from collections import namedtuple
            outputs = namedtuple('outputs', ['result'])
            return outputs(x * 2)
        
        # Should be handled by executor
        with patch('twingraph.orchestration.executor.GraphManager'):
            with patch('twingraph.orchestration.executor.ComponentExecutor._get_git_attributes') as mock_git:
                mock_git.return_value = {
                    'GitCommit': 'abc123',
                    'GitBranch': 'main'
                }
                
                result = git_tracked_component(5)
                assert result['outputs']['result'] == 10
    
    def test_graph_config_syntax(self):
        """Test graph configuration syntax."""
        graph_config = {
            'graph_endpoint': 'ws://neptune-cluster.region.amazonaws.com:8182'
        }
        
        @component(graph_config=graph_config)
        def neptune_component(data: str) -> NamedTuple:
            from collections import namedtuple
            outputs = namedtuple('outputs', ['data'])
            return outputs(data.upper())
        
        # Graph config should be passed to executor
        assert neptune_component._twingraph_metadata
    
    def test_additional_attributes(self):
        """Test additional attributes syntax."""
        additional_attrs = {
            'team': 'data-science',
            'project': 'recommendation',
            'version': '1.0.0'
        }
        
        @component(additional_attributes=additional_attrs)
        def attributed_component(x: int) -> NamedTuple:
            from collections import namedtuple
            outputs = namedtuple('outputs', ['value'])
            return outputs(x)
        
        # Should be handled in executor
        assert attributed_component._twingraph_metadata


class TestDeprecatedFeatures:
    """Test handling of deprecated features."""
    
    def test_auto_infer_deprecation(self):
        """Test that auto_infer is handled but deprecated."""
        with pytest.warns(DeprecationWarning, match="auto_infer"):
            @component(auto_infer=True)
            def auto_infer_component(x: int) -> NamedTuple:
                from collections import namedtuple
                outputs = namedtuple('outputs', ['value'])
                return outputs(x)
    
    def test_f_py_parameter(self):
        """Test f_py parameter handling."""
        def my_func(x: int) -> NamedTuple:
            from collections import namedtuple
            outputs = namedtuple('outputs', ['value'])
            return outputs(x * 2)
        
        # Should work with f_py parameter
        decorated = component(f_py=my_func)
        assert hasattr(decorated, '_twingraph_metadata')


class TestExampleCompatibility:
    """Test that all examples still work."""
    
    def test_demo1_graph_tracing(self):
        """Test demo 1 graph tracing example."""
        # Copy of demo_1 code
        @component()
        def Func_C_subtract(input_1, input_2):
            from collections import namedtuple
            outputs = namedtuple('outputs', ['subtraction'])
            return outputs(input_1 - input_2)
        
        @component()
        def Func_D_divide(input_1, input_2) -> NamedTuple:
            import numpy as np
            division = input_1 / input_2
            random_sign = np.random.random()-0.5
            from collections import namedtuple
            outputs = namedtuple('outputs', ['division'])
            return outputs(division * random_sign)
        
        @component()
        def Func_E_average(input_1, input_2, input_3, input_4) -> NamedTuple:
            import numpy as np
            output_1 = np.mean([input_1, input_2, input_3, input_4])
            from collections import namedtuple
            outputs = namedtuple('outputs', ['average'])
            return outputs(output_1)
        
        # Should all work without errors
        with patch('twingraph.orchestration.executor.GraphManager'):
            result_c = Func_C_subtract(10, 3)
            assert result_c['outputs']['subtraction'] == 7
            
            result_d = Func_D_divide(10, 2)
            assert 'division' in result_d['outputs']
            
            result_e = Func_E_average(1, 2, 3, 4)
            assert result_e['outputs']['average'] == 2.5
    
    def test_multi_pipeline_support(self):
        """Test multi-pipeline execution."""
        @pipeline(multipipeline=True, clear_graph=False)
        def pipeline_a():
            return {'pipeline': 'A'}
        
        @pipeline(multipipeline=True, clear_graph=False)
        def pipeline_b():
            return {'pipeline': 'B'}
        
        # Both should work without clearing each other's graphs
        with patch('twingraph.orchestration.executor.GraphManager') as mock_gm:
            mock_gm.return_value.clear_graph = Mock()
            
            result_a = pipeline_a()
            result_b = pipeline_b()
            
            # Graph should not be cleared
            mock_gm.return_value.clear_graph.assert_not_called()


class TestMigrationPath:
    """Test migration from old to new syntax."""
    
    def test_docker_id_to_docker_image(self):
        """Test migration from docker_id to docker_image."""
        # Old syntax
        @component(docker_id='python:3.8')
        def old_syntax(x: int) -> NamedTuple:
            from collections import namedtuple
            outputs = namedtuple('outputs', ['value'])
            return outputs(x)
        
        # New syntax
        @component(docker_image='python:3.8', platform='docker')
        def new_syntax(x: int) -> NamedTuple:
            from collections import namedtuple
            outputs = namedtuple('outputs', ['value'])
            return outputs(x)
        
        # Both should have same docker image
        assert old_syntax._twingraph_metadata.config.docker_image == 'python:3.8'
        assert new_syntax._twingraph_metadata.config.docker_image == 'python:3.8'
    
    def test_task_flags_to_platform(self):
        """Test migration from task flags to platform parameter."""
        # Old syntax with flags
        @component(kubernetes_task=True, docker_id='nginx')
        def old_k8s(x: str) -> NamedTuple:
            from collections import namedtuple
            outputs = namedtuple('outputs', ['result'])
            return outputs(x)
        
        # New syntax with platform
        @component(platform='kubernetes', docker_image='nginx')
        def new_k8s(x: str) -> NamedTuple:
            from collections import namedtuple
            outputs = namedtuple('outputs', ['result'])
            return outputs(x)
        
        # Both should use Kubernetes platform
        assert old_k8s._twingraph_metadata.platform.value == 'kubernetes'
        assert new_k8s._twingraph_metadata.platform.value == 'kubernetes'