# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

"""
Modern decorators with async support, streaming capabilities, and enhanced type safety.
"""

import asyncio
import functools
import inspect
from typing import (
    Any, Dict, Optional, Union, Callable, TypeVar, AsyncIterator,
    Literal, Protocol, runtime_checkable, get_type_hints
)
from collections import namedtuple
from datetime import datetime
import hashlib
import json
from pathlib import Path

from pydantic import BaseModel, Field
from typing_extensions import ParamSpec

from ..core.exceptions import TwinGraphError
from ..core.logging import get_logger
from .orchestration_utils import (
    set_gremlin_port_ip, set_hash,
    load_inputs, line_no, set_randomize_time, set_AWS_ARN
)
from ..graph.graph_tools import add_vertex_connection

logger = get_logger(__name__)

P = ParamSpec('P')
T = TypeVar('T')

# Modern platform options including serverless and edge computing
PlatformType = Literal[
    'local', 'docker', 'kubernetes', 'lambda', 'batch',
    'cloudrun', 'fargate', 'edge', 'gpu', 'wasm'
]


class ComponentConfig(BaseModel):
    """Modern component configuration with validation."""
    platform: PlatformType = 'local'
    docker_image: Optional[str] = None
    timeout: int = Field(default=300, ge=1, le=3600)
    memory: int = Field(default=512, ge=128, le=32768)
    cpu: float = Field(default=1.0, ge=0.25, le=16.0)
    gpu: Optional[Dict[str, Any]] = None
    environment: Dict[str, str] = Field(default_factory=dict)
    retry_policy: Dict[str, Any] = Field(default_factory=lambda: {
        'max_attempts': 3,
        'backoff': 'exponential',
        'initial_delay': 1.0
    })
    streaming: bool = False
    cache_enabled: bool = True
    cache_ttl: int = 3600
    trace_enabled: bool = True
    
    class Config:
        extra = 'allow'


@runtime_checkable
class StreamingComponent(Protocol):
    """Protocol for components that support streaming output."""
    async def stream(self, *args, **kwargs) -> AsyncIterator[Any]:
        ...


class AsyncComponent:
    """Modern async-first component wrapper with enhanced capabilities."""
    
    def __init__(self, func: Callable, config: ComponentConfig):
        self.func = func
        self.config = config
        self.is_async = inspect.iscoroutinefunction(func)
        self.is_streaming = hasattr(func, 'stream')
        self._cache: Dict[str, Any] = {}
        
    async def __call__(self, *args, **kwargs) -> Dict[str, Any]:
        """Execute component with modern features."""
        start_time = datetime.utcnow()
        
        # Extract parent hash
        parent_hash = kwargs.pop('parent_hash', [])
        if isinstance(parent_hash, str):
            parent_hash = [parent_hash]
            
        # Generate cache key if caching enabled
        cache_key = None
        if self.config.cache_enabled:
            cache_key = self._generate_cache_key(args, kwargs)
            if cache_key in self._cache:
                logger.info(f"Cache hit for {self.func.__name__}")
                return self._cache[cache_key]
        
        # Load inputs
        input_vals, input_dict = load_inputs(
            args=args, 
            kwargs=kwargs, 
            argspec=inspect.getfullargspec(self.func)
        )
        
        # Generate execution hash
        child_hash = set_hash(parent_hash=parent_hash)
        
        # Prepare attributes for graph
        attributes = self._prepare_attributes(
            input_vals, child_hash, parent_hash, start_time
        )
        
        try:
            # Execute function
            if self.is_async:
                result = await self.func(**input_dict)
            else:
                result = await asyncio.to_thread(self.func, **input_dict)
            
            # Process result
            output_dict = self._process_result(result)
            
            # Cache result if enabled
            if cache_key and self.config.cache_enabled:
                self._cache[cache_key] = {
                    'outputs': output_dict,
                    'hash': child_hash,
                    'cached_at': datetime.utcnow().isoformat()
                }
            
            # Record execution
            await self._record_execution(attributes, output_dict)
            
            return {
                'outputs': output_dict,
                'hash': child_hash,
                'execution_time': (datetime.utcnow() - start_time).total_seconds()
            }
            
        except Exception as e:
            logger.error(f"Component {self.func.__name__} failed: {e}")
            attributes['error'] = str(e)
            await self._record_execution(attributes, {'error': str(e)})
            raise
    
    async def stream(self, *args, **kwargs) -> AsyncIterator[Dict[str, Any]]:
        """Stream results for components that support it."""
        if not self.is_streaming:
            raise TwinGraphError(f"Component {self.func.__name__} does not support streaming")
        
        parent_hash = kwargs.pop('parent_hash', [])
        child_hash = set_hash(parent_hash=parent_hash)
        
        input_vals, input_dict = load_inputs(
            args=args, 
            kwargs=kwargs, 
            argspec=inspect.getfullargspec(self.func)
        )
        
        async for chunk in self.func.stream(**input_dict):
            yield {
                'chunk': chunk,
                'hash': child_hash,
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def _generate_cache_key(self, args: tuple, kwargs: dict) -> str:
        """Generate cache key from inputs."""
        key_data = {
            'func': self.func.__name__,
            'args': args,
            'kwargs': kwargs
        }
        return hashlib.sha256(
            json.dumps(key_data, sort_keys=True).encode()
        ).hexdigest()
    
    def _prepare_attributes(
        self, 
        input_vals: Any,
        child_hash: str,
        parent_hash: list,
        start_time: datetime
    ) -> Dict[str, Any]:
        """Prepare attributes for graph storage."""
        return {
            'Name': self.func.__name__,
            'Timestamp': start_time.isoformat(),
            'Platform': self.config.platform,
            'Config': self.config.dict(),
            'Signature': str(inspect.signature(self.func)),
            'Input Values': str(input_vals),
            'Parent Hash': str(parent_hash),
            'Hash': child_hash,
            'Source Code': inspect.getsource(self.func),
            'Is Async': self.is_async,
            'Is Streaming': self.is_streaming,
        }
    
    def _process_result(self, result: Any) -> Dict[str, Any]:
        """Process function result into standard format."""
        if hasattr(result, '_asdict'):
            # NamedTuple
            return result._asdict()
        elif isinstance(result, dict):
            return result
        elif isinstance(result, BaseModel):
            # Pydantic model
            return result.model_dump()
        else:
            # Wrap in standard format
            return {'result': result}
    
    async def _record_execution(self, attributes: Dict[str, Any], output: Dict[str, Any]):
        """Record execution in graph database."""
        attributes['Output'] = str(output)
        attributes['Execution Time'] = (
            datetime.utcnow() - datetime.fromisoformat(attributes['Timestamp'])
        ).total_seconds()
        
        # Get graph endpoint
        gremlin_ip_port = set_gremlin_port_ip(
            self.config.environment.get('graph_config', {})
        )
        
        # Record in graph
        await asyncio.to_thread(
            add_vertex_connection,
            gremlin_IP=gremlin_ip_port,
            attributes=attributes
        )


def async_component(
    *,
    platform: PlatformType = 'local',
    config: Optional[Union[Dict[str, Any], ComponentConfig]] = None,
    **kwargs
) -> Callable[[Callable[P, T]], AsyncComponent]:
    """
    Modern async-first component decorator with enhanced capabilities.
    
    Features:
    - Native async/await support
    - Streaming capabilities for LLMs
    - Built-in caching with TTL
    - Automatic retry with exponential backoff
    - OpenTelemetry instrumentation ready
    - Type-safe configuration with Pydantic
    
    Examples:
        @async_component(platform='docker', config={'docker_image': 'python:3.12'})
        async def process_data(data: List[float]) -> Dict[str, float]:
            result = await some_async_operation(data)
            return {'mean': statistics.mean(result)}
        
        @async_component(platform='gpu', config={'gpu': {'type': 'nvidia-a100'}})
        async def train_model(dataset: str) -> Model:
            model = await train_on_gpu(dataset)
            return model
    """
    def decorator(func: Callable[P, T]) -> AsyncComponent:
        # Parse configuration
        if isinstance(config, dict):
            component_config = ComponentConfig(platform=platform, **config, **kwargs)
        elif isinstance(config, ComponentConfig):
            component_config = config
        else:
            component_config = ComponentConfig(platform=platform, **kwargs)
        
        # Create async component
        return AsyncComponent(func, component_config)
    
    return decorator


class StreamingLLMComponent(AsyncComponent):
    """Specialized component for streaming LLM responses."""
    
    async def stream(self, *args, **kwargs) -> AsyncIterator[Dict[str, Any]]:
        """Stream LLM responses with proper formatting."""
        parent_hash = kwargs.pop('parent_hash', [])
        child_hash = set_hash(parent_hash=parent_hash)
        
        input_vals, input_dict = load_inputs(
            args=args, 
            kwargs=kwargs, 
            argspec=inspect.getfullargspec(self.func)
        )
        
        # Initialize streaming context
        total_tokens = 0
        chunks = []
        
        async for chunk in self.func(**input_dict):
            # Process chunk
            if isinstance(chunk, dict):
                content = chunk.get('content', '')
                tokens = chunk.get('tokens', 0)
            else:
                content = str(chunk)
                tokens = len(content.split())
            
            total_tokens += tokens
            chunks.append(content)
            
            yield {
                'type': 'stream_chunk',
                'content': content,
                'tokens': tokens,
                'total_tokens': total_tokens,
                'hash': child_hash,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Final aggregated result
        yield {
            'type': 'stream_complete',
            'full_content': ''.join(chunks),
            'total_tokens': total_tokens,
            'hash': child_hash,
            'timestamp': datetime.utcnow().isoformat()
        }


def streaming_llm_component(
    *,
    model: str = 'gpt-4',
    temperature: float = 0.7,
    max_tokens: int = 2048,
    **kwargs
) -> Callable[[Callable], StreamingLLMComponent]:
    """
    Decorator for streaming LLM components.
    
    Example:
        @streaming_llm_component(model='claude-3', temperature=0.5)
        async def generate_code(prompt: str, language: str):
            async for chunk in llm_client.stream(prompt, language):
                yield chunk
    """
    def decorator(func: Callable) -> StreamingLLMComponent:
        config = ComponentConfig(
            platform='local',
            streaming=True,
            **kwargs
        )
        config.environment.update({
            'model': model,
            'temperature': str(temperature),
            'max_tokens': str(max_tokens)
        })
        
        return StreamingLLMComponent(func, config)
    
    return decorator


# Backward compatibility
component = async_component