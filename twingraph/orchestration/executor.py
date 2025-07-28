"""
Execution engines for TwinGraph components and pipelines.
"""

import asyncio
import hashlib
import json
import time
import traceback
from collections import namedtuple
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
import logging

from ..graph.graph_tools import GraphManager
from ..core.exceptions import ComponentExecutionError, PipelineExecutionError
from ..core.logging import get_logger, global_monitor, monitor_performance
from .config import ComponentConfig, PipelineConfig
from .decorators import ComponentMetadata, ComputePlatform
from .platforms import (
    DockerExecutor, KubernetesExecutor, LambdaExecutor, 
    BatchExecutor, LocalExecutor, SlurmExecutor, SSHExecutor
)

logger = get_logger(__name__)


class ComponentExecutor:
    """Executes individual components with platform abstraction."""
    
    def __init__(
        self,
        metadata: ComponentMetadata,
        graph_config: Dict[str, Any],
        additional_attributes: Dict[str, Any],
        git_tracking: bool
    ):
        self.metadata = metadata
        self.graph_config = graph_config
        self.additional_attributes = additional_attributes
        self.git_tracking = git_tracking
        self.graph_manager = GraphManager(graph_config)
        
        # Initialize platform executor
        self.platform_executor = self._get_platform_executor()
    
    def _get_platform_executor(self):
        """Get the appropriate platform executor."""
        executors = {
            ComputePlatform.LOCAL: LocalExecutor,
            ComputePlatform.DOCKER: DockerExecutor,
            ComputePlatform.KUBERNETES: KubernetesExecutor,
            ComputePlatform.LAMBDA: LambdaExecutor,
            ComputePlatform.BATCH: BatchExecutor,
            ComputePlatform.SLURM: SlurmExecutor,
            ComputePlatform.SSH: SSHExecutor,
        }
        
        executor_class = executors.get(self.metadata.platform)
        if not executor_class:
            raise ValueError(f"Unknown platform: {self.metadata.platform}")
        
        return executor_class(self.metadata.config)
    
    def execute(
        self, 
        func: Callable, 
        args: Tuple[Any, ...], 
        kwargs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute the component function."""
        start_time = time.time()
        execution_id = self._generate_execution_id()
        
        # Extract parent hashes
        parent_hashes = self._extract_parent_hashes(kwargs)
        kwargs = {k: v for k, v in kwargs.items() if k != 'parent_hash'}
        
        # Prepare execution context
        context = {
            'execution_id': execution_id,
            'component_name': self.metadata.name,
            'start_time': datetime.utcnow().isoformat(),
            'inputs': self._serialize_inputs(args, kwargs),
            'parent_hashes': parent_hashes
        }
        
        try:
            # Execute with retry logic
            result = self._execute_with_retry(func, args, kwargs, context)
            
            # Process results
            execution_time = time.time() - start_time
            processed_result = self._process_result(result, execution_id)
            
            # Record in graph
            self._record_execution(
                context, processed_result, execution_time, success=True
            )
            
            # Log execution
            logger.log_execution(
                component=self.metadata.name,
                execution_id=execution_id,
                status='success',
                duration=execution_time,
                metadata={
                    'platform': self.metadata.platform.value,
                    'inputs': context['inputs']
                }
            )
            
            # Record metrics
            global_monitor.record_execution(
                component=self.metadata.name,
                platform=self.metadata.platform.value,
                duration=execution_time,
                success=True
            )
            
            return processed_result
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_info = {
                'error_type': type(e).__name__,
                'error_message': str(e),
                'traceback': traceback.format_exc()
            }
            
            # Record failure in graph
            self._record_execution(
                context, error_info, execution_time, success=False
            )
            
            # Log error
            logger.log_error(
                component=self.metadata.name,
                error=e,
                execution_id=execution_id,
                metadata={
                    'platform': self.metadata.platform.value,
                    'duration': execution_time
                }
            )
            
            # Record metrics
            global_monitor.record_execution(
                component=self.metadata.name,
                platform=self.metadata.platform.value,
                duration=execution_time,
                success=False,
                error_type=type(e).__name__
            )
            
            raise ComponentExecutionError(
                f"Component {self.metadata.name} failed: {str(e)}"
            ) from e
    
    def _execute_with_retry(
        self, 
        func: Callable, 
        args: Tuple[Any, ...], 
        kwargs: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """Execute function with retry logic."""
        config = self.metadata.config
        
        for attempt in range(config.max_retries if config.auto_retry else 1):
            try:
                if self.metadata.platform == ComputePlatform.LOCAL:
                    # Direct execution for local
                    return func(*args, **kwargs)
                else:
                    # Platform-specific execution
                    return self.platform_executor.execute(
                        func, args, kwargs, context
                    )
            except Exception as e:
                if not config.auto_retry or attempt == config.max_retries - 1:
                    raise
                
                wait_time = min(2 ** attempt, 30)  # Exponential backoff
                logger.logger.warning(
                    f"Attempt {attempt + 1} failed for {self.metadata.name}, "
                    f"retrying in {wait_time}s: {str(e)}",
                    extra={
                        'component': self.metadata.name,
                        'attempt': attempt + 1,
                        'max_attempts': config.max_retries,
                        'wait_time': wait_time,
                        'error': str(e)
                    }
                )
                time.sleep(wait_time)
    
    def _generate_execution_id(self) -> str:
        """Generate unique execution ID."""
        timestamp = str(time.time())
        component_name = self.metadata.name
        hash_input = f"{timestamp}-{component_name}".encode()
        return hashlib.sha256(hash_input).hexdigest()[:16]
    
    def _extract_parent_hashes(self, kwargs: Dict[str, Any]) -> List[str]:
        """Extract parent hashes from kwargs."""
        parent_hash = kwargs.get('parent_hash', [])
        if isinstance(parent_hash, str):
            return [parent_hash]
        return parent_hash
    
    def _serialize_inputs(
        self, 
        args: Tuple[Any, ...], 
        kwargs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Serialize inputs for storage."""
        # Bind arguments to signature
        bound = self.metadata.signature.bind(*args, **kwargs)
        bound.apply_defaults()
        
        # Serialize to JSON-compatible format
        serialized = {}
        for name, value in bound.arguments.items():
            try:
                serialized[name] = json.loads(json.dumps(value))
            except (TypeError, ValueError):
                serialized[name] = str(value)
        
        return serialized
    
    def _process_result(self, result: Any, execution_id: str) -> Dict[str, Any]:
        """Process component result into standard format."""
        if hasattr(result, '_asdict'):
            # NamedTuple result
            outputs = result._asdict()
        elif isinstance(result, dict):
            outputs = result
        else:
            # Wrap non-dict results
            outputs = {'result': result}
        
        return {
            'outputs': outputs,
            'hash': execution_id,
            'component': self.metadata.name,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _record_execution(
        self,
        context: Dict[str, Any],
        result: Dict[str, Any],
        execution_time: float,
        success: bool
    ):
        """Record execution in graph database."""
        attributes = {
            'Name': self.metadata.name,
            'ExecutionID': context['execution_id'],
            'StartTime': context['start_time'],
            'ExecutionTime': execution_time,
            'Success': success,
            'Platform': self.metadata.platform.value,
            'Inputs': json.dumps(context['inputs']),
            'ParentHashes': json.dumps(context['parent_hashes']),
            'SourceCode': self.metadata.source_code,
            'FilePath': self.metadata.file_path,
            'LineNumber': self.metadata.line_number
        }
        
        if success:
            attributes['Outputs'] = json.dumps(result)
        else:
            attributes['Error'] = json.dumps(result)
        
        # Add additional attributes
        attributes.update(self.additional_attributes)
        
        # Add git tracking if enabled
        if self.git_tracking:
            attributes.update(self._get_git_attributes())
        
        # Record in graph
        self.graph_manager.add_component_execution(
            attributes, context['parent_hashes']
        )
    
    def _get_git_attributes(self) -> Dict[str, Any]:
        """Get git-related attributes."""
        try:
            import git
            repo = git.Repo(search_parent_directories=True)
            
            return {
                'GitCommit': repo.head.commit.hexsha,
                'GitBranch': repo.active_branch.name,
                'GitAuthor': str(repo.head.commit.author),
                'GitMessage': repo.head.commit.message.strip()
            }
        except Exception as e:
            logger.warning(f"Failed to get git attributes: {e}")
            return {}


class PipelineExecutor:
    """Executes pipelines with optional distributed execution."""
    
    def __init__(
        self,
        config: PipelineConfig,
        graph_config: Dict[str, Any],
        clear_graph: bool
    ):
        self.config = config
        self.graph_config = graph_config
        self.clear_graph = clear_graph
        self.graph_manager = GraphManager(graph_config)
        
        # Initialize Celery if enabled
        if config.celery_enabled:
            self._initialize_celery()
    
    def execute(
        self, 
        func: Callable, 
        args: Tuple[Any, ...], 
        kwargs: Dict[str, Any]
    ) -> Any:
        """Execute the pipeline function."""
        if self.clear_graph:
            self.graph_manager.clear_graph()
        
        start_time = time.time()
        pipeline_id = self._generate_pipeline_id()
        
        try:
            # Record pipeline start
            self._record_pipeline_start(pipeline_id)
            
            if self.config.celery_enabled:
                # Distributed execution
                result = self._execute_distributed(func, args, kwargs, pipeline_id)
            else:
                # Local execution
                result = self._execute_local(func, args, kwargs, pipeline_id)
            
            # Record pipeline completion
            execution_time = time.time() - start_time
            self._record_pipeline_completion(pipeline_id, execution_time, True)
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            self._record_pipeline_completion(
                pipeline_id, execution_time, False, str(e)
            )
            raise PipelineExecutionError(
                f"Pipeline {self.config.name} failed: {str(e)}"
            ) from e
    
    def _initialize_celery(self):
        """Initialize Celery for distributed execution."""
        # This will be implemented based on existing Celery logic
        pass
    
    def _execute_local(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
        pipeline_id: str
    ) -> Any:
        """Execute pipeline locally."""
        # Set up execution context
        context = {
            'pipeline_id': pipeline_id,
            'pipeline_name': self.config.name,
            'monitoring_enabled': self.config.monitoring_enabled
        }
        
        # Execute the pipeline function
        with self._monitoring_context(context):
            return func(*args, **kwargs)
    
    def _execute_distributed(
        self,
        func: Callable,
        args: Tuple[Any, ...],
        kwargs: Dict[str, Any],
        pipeline_id: str
    ) -> Any:
        """Execute pipeline using Celery."""
        # This will implement the Celery-based distribution logic
        raise NotImplementedError("Distributed execution coming soon")
    
    def _generate_pipeline_id(self) -> str:
        """Generate unique pipeline ID."""
        timestamp = str(time.time())
        pipeline_name = self.config.name
        hash_input = f"{timestamp}-{pipeline_name}".encode()
        return hashlib.sha256(hash_input).hexdigest()[:16]
    
    def _record_pipeline_start(self, pipeline_id: str):
        """Record pipeline start in graph."""
        attributes = {
            'Name': f"Pipeline:{self.config.name}",
            'PipelineID': pipeline_id,
            'StartTime': datetime.utcnow().isoformat(),
            'Type': 'PipelineStart'
        }
        self.graph_manager.add_pipeline_node(attributes)
    
    def _record_pipeline_completion(
        self,
        pipeline_id: str,
        execution_time: float,
        success: bool,
        error: Optional[str] = None
    ):
        """Record pipeline completion in graph."""
        attributes = {
            'Name': f"Pipeline:{self.config.name}",
            'PipelineID': pipeline_id,
            'EndTime': datetime.utcnow().isoformat(),
            'ExecutionTime': execution_time,
            'Success': success,
            'Type': 'PipelineEnd'
        }
        
        if error:
            attributes['Error'] = error
        
        self.graph_manager.add_pipeline_node(attributes)
    
    def _monitoring_context(self, context: Dict[str, Any]):
        """Context manager for pipeline monitoring."""
        class MonitoringContext:
            def __enter__(self):
                if context['monitoring_enabled']:
                    logger.info(f"Starting pipeline {context['pipeline_name']}")
                return self
            
            def __exit__(self, exc_type, exc_val, exc_tb):
                if context['monitoring_enabled']:
                    if exc_type:
                        logger.error(
                            f"Pipeline {context['pipeline_name']} failed: {exc_val}"
                        )
                    else:
                        logger.info(
                            f"Pipeline {context['pipeline_name']} completed"
                        )
        
        return MonitoringContext()