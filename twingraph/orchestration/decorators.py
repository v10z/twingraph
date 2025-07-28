"""
Decorators for TwinGraph orchestration.

This module provides the core decorators (@component and @pipeline) used to define
and orchestrate computational workflows in TwinGraph.
"""

from typing import (
    Any, Callable, Dict, List, Optional, Union, TypeVar, cast,
    NamedTuple, Type
)
from functools import wraps
import inspect
import logging
from dataclasses import dataclass
from enum import Enum

from .executor import ComponentExecutor, PipelineExecutor
from .config import ComponentConfig, PipelineConfig
from ..graph.graph_tools import GraphManager
from ..core.exceptions import TwinGraphError

logger = logging.getLogger(__name__)

F = TypeVar('F', bound=Callable[..., Any])


class ComputePlatform(Enum):
    """Supported compute platforms for component execution."""
    LOCAL = "local"
    DOCKER = "docker"
    KUBERNETES = "kubernetes"
    LAMBDA = "lambda"
    BATCH = "batch"
    SLURM = "slurm"
    SSH = "ssh"


@dataclass
class ComponentMetadata:
    """Metadata for a component function."""
    name: str
    signature: inspect.Signature
    source_code: str
    file_path: str
    line_number: int
    platform: ComputePlatform
    config: ComponentConfig


def component(
    *,
    platform: Union[str, ComputePlatform] = ComputePlatform.LOCAL,
    docker_image: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
    graph_config: Optional[Dict[str, Any]] = None,
    additional_attributes: Optional[Dict[str, Any]] = None,
    git_tracking: bool = False,
    auto_retry: bool = True,
    max_retries: int = 3,
    timeout: Optional[int] = None
) -> Callable[[F], F]:
    """
    Decorator to create a TwinGraph component.
    
    A component is a unit of computation that can be executed on various platforms
    and automatically tracked in the graph database.
    
    Args:
        platform: Compute platform to execute on
        docker_image: Docker image to use (if applicable)
        config: Platform-specific configuration
        graph_config: Graph database configuration
        additional_attributes: Extra attributes to store in graph
        git_tracking: Whether to track git history
        auto_retry: Enable automatic retry on failure
        max_retries: Maximum number of retry attempts
        timeout: Execution timeout in seconds
        
    Returns:
        Decorated function that returns a ComponentResult
        
    Example:
        @component(platform="docker", docker_image="python:3.9")
        def process_data(data: List[float]) -> NamedTuple:
            result = sum(data) / len(data)
            Output = namedtuple('Output', ['average'])
            return Output(average=result)
    """
    def decorator(func: F) -> F:
        # Validate function signature
        sig = inspect.signature(func)
        if not _validate_component_signature(func, sig):
            raise TwinGraphError(
                f"Component {func.__name__} must return a NamedTuple"
            )
        
        # Extract metadata
        metadata = ComponentMetadata(
            name=func.__name__,
            signature=sig,
            source_code=inspect.getsource(func),
            file_path=inspect.getfile(func),
            line_number=inspect.getsourcelines(func)[1],
            platform=ComputePlatform(platform) if isinstance(platform, str) else platform,
            config=ComponentConfig(
                platform_config=config or {},
                docker_image=docker_image,
                timeout=timeout,
                auto_retry=auto_retry,
                max_retries=max_retries
            )
        )
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            executor = ComponentExecutor(
                metadata=metadata,
                graph_config=graph_config or {},
                additional_attributes=additional_attributes or {},
                git_tracking=git_tracking
            )
            
            return executor.execute(func, args, kwargs)
        
        # Attach metadata for introspection
        wrapper._twingraph_metadata = metadata
        wrapper._is_twingraph_component = True
        
        return cast(F, wrapper)
    
    return decorator


def pipeline(
    *,
    name: Optional[str] = None,
    celery_enabled: bool = False,
    celery_config: Optional[Dict[str, Any]] = None,
    graph_config: Optional[Dict[str, Any]] = None,
    clear_graph: bool = True,
    distributed: bool = False,
    monitoring_enabled: bool = True
) -> Callable[[F], F]:
    """
    Decorator to create a TwinGraph pipeline.
    
    A pipeline orchestrates multiple components into a workflow that can be
    executed locally or distributed across multiple nodes.
    
    Args:
        name: Pipeline name (defaults to function name)
        celery_enabled: Enable Celery for distributed execution
        celery_config: Celery-specific configuration
        graph_config: Graph database configuration
        clear_graph: Clear graph before execution
        distributed: Enable distributed execution
        monitoring_enabled: Enable execution monitoring
        
    Returns:
        Decorated function that orchestrates components
        
    Example:
        @pipeline(celery_enabled=True)
        def ml_pipeline():
            data = load_data()
            processed = preprocess(data)
            model = train_model(processed)
            results = evaluate(model, processed)
            return results
    """
    def decorator(func: F) -> F:
        pipeline_name = name or func.__name__
        
        # Create pipeline configuration
        config = PipelineConfig(
            name=pipeline_name,
            celery_enabled=celery_enabled,
            celery_config=celery_config or {},
            distributed=distributed,
            monitoring_enabled=monitoring_enabled
        )
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            executor = PipelineExecutor(
                config=config,
                graph_config=graph_config or {},
                clear_graph=clear_graph
            )
            
            return executor.execute(func, args, kwargs)
        
        # Attach metadata
        wrapper._twingraph_pipeline = True
        wrapper._pipeline_config = config
        
        return cast(F, wrapper)
    
    return decorator


def _validate_component_signature(func: Callable, sig: inspect.Signature) -> bool:
    """Validate that a component function has the correct signature."""
    # Check return annotation
    if sig.return_annotation == inspect.Parameter.empty:
        return True  # No annotation is okay
    
    # If annotated, must be NamedTuple
    if hasattr(sig.return_annotation, '__origin__'):
        origin = getattr(sig.return_annotation, '__origin__', None)
        if origin is type or origin is Type:
            # Check if it's Type[NamedTuple] or similar
            return True
    
    # Check if it's a direct NamedTuple reference
    if inspect.isclass(sig.return_annotation):
        return issubclass(sig.return_annotation, tuple) and hasattr(
            sig.return_annotation, '_fields'
        )
    
    return True  # Be permissive for now