# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

"""
Robust utilities for TwinGraph orchestration, inspired by best practices
from Kubeflow, Argo Workflows, and Metaflow.
"""

import json
import hashlib
import inspect
import os
import time
import random
from datetime import datetime
from typing import Any, Dict, List, Tuple, Optional, Union, Callable
from pathlib import Path
import pickle
import cloudpickle
from dataclasses import dataclass, asdict
from functools import wraps

import pandas as pd
import numpy as np


# ============================================================================
# Configuration Management (inspired by Kubeflow)
# ============================================================================

@dataclass
class GraphConfig:
    """Strongly typed configuration for graph database."""
    endpoint: str = "ws://127.0.0.1:8182/gremlin"
    timeout: int = 30
    retry_count: int = 3
    retry_delay: float = 1.0
    
    @classmethod
    def from_dict(cls, config: Dict[str, Any]) -> 'GraphConfig':
        """Create config from dictionary with validation."""
        if 'graph_endpoint' in config:
            config['endpoint'] = config.pop('graph_endpoint')
        return cls(**{k: v for k, v in config.items() if k in cls.__annotations__})
    
    @classmethod
    def from_env(cls) -> 'GraphConfig':
        """Load configuration from environment variables."""
        return cls(
            endpoint=os.getenv('TWINGRAPH_GREMLIN_ENDPOINT', cls.endpoint),
            timeout=int(os.getenv('TWINGRAPH_GREMLIN_TIMEOUT', str(cls.timeout))),
            retry_count=int(os.getenv('TWINGRAPH_RETRY_COUNT', str(cls.retry_count))),
            retry_delay=float(os.getenv('TWINGRAPH_RETRY_DELAY', str(cls.retry_delay)))
        )


# ============================================================================
# Parameter Handling (inspired by Metaflow)
# ============================================================================

class Parameter:
    """Type-safe parameter definition with validation."""
    
    def __init__(
        self, 
        name: str,
        type: type = Any,
        default: Any = None,
        required: bool = True,
        validator: Optional[Callable] = None,
        help: str = ""
    ):
        self.name = name
        self.type = type
        self.default = default
        self.required = required
        self.validator = validator
        self.help = help
    
    def validate(self, value: Any) -> Any:
        """Validate and convert parameter value."""
        if value is None and self.required:
            raise ValueError(f"Parameter '{self.name}' is required")
        
        if value is None:
            return self.default
        
        # Type conversion
        if self.type != Any:
            try:
                if self.type == bool and isinstance(value, str):
                    value = value.lower() in ('true', '1', 'yes')
                else:
                    value = self.type(value)
            except (ValueError, TypeError) as e:
                raise TypeError(
                    f"Parameter '{self.name}' expects {self.type.__name__}, "
                    f"got {type(value).__name__}: {e}"
                )
        
        # Custom validation
        if self.validator:
            value = self.validator(value)
        
        return value


def robust_load_inputs(
    args: tuple,
    kwargs: dict,
    func_spec: inspect.FullArgSpec,
    parameters: Optional[Dict[str, Parameter]] = None
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Robustly load and validate function inputs.
    
    Returns:
        - serializable_dict: JSON-serializable version of inputs
        - runtime_dict: Actual runtime values (may include non-serializable objects)
    """
    # Build complete input dictionary
    runtime_dict = {}
    
    # Map positional arguments
    for i, arg_value in enumerate(args):
        if i < len(func_spec.args):
            arg_name = func_spec.args[i]
            runtime_dict[arg_name] = arg_value
    
    # Add keyword arguments
    runtime_dict.update(kwargs)
    
    # Apply parameter validation if provided
    if parameters:
        for param_name, param in parameters.items():
            if param_name in runtime_dict:
                runtime_dict[param_name] = param.validate(runtime_dict[param_name])
            elif param.required:
                raise ValueError(f"Missing required parameter: {param_name}")
            else:
                runtime_dict[param_name] = param.default
    
    # Create serializable version
    serializable_dict = serialize_inputs(runtime_dict)
    
    return serializable_dict, runtime_dict


# ============================================================================
# Serialization (inspired by Argo Workflows)
# ============================================================================

class TwinGraphSerializer:
    """Enhanced serialization with support for common data types."""
    
    @staticmethod
    def serialize(obj: Any) -> Union[str, Dict, List]:
        """Serialize object to JSON-compatible format."""
        # Handle None
        if obj is None:
            return None
        
        # Handle primitives
        if isinstance(obj, (str, int, float, bool)):
            return obj
        
        # Handle datetime
        if isinstance(obj, datetime):
            return {"__type__": "datetime", "value": obj.isoformat()}
        
        # Handle Path
        if isinstance(obj, Path):
            return {"__type__": "Path", "value": str(obj)}
        
        # Handle numpy arrays
        if isinstance(obj, np.ndarray):
            return {
                "__type__": "numpy.ndarray",
                "dtype": str(obj.dtype),
                "shape": obj.shape,
                "data": obj.tolist()
            }
        
        # Handle pandas DataFrames
        if isinstance(obj, pd.DataFrame):
            return {
                "__type__": "pandas.DataFrame",
                "data": obj.to_dict(orient='records'),
                "columns": list(obj.columns),
                "index": obj.index.tolist()
            }
        
        # Handle pandas Series
        if isinstance(obj, pd.Series):
            return {
                "__type__": "pandas.Series",
                "data": obj.to_dict(),
                "name": obj.name
            }
        
        # Handle lists and tuples
        if isinstance(obj, (list, tuple)):
            serialized = [TwinGraphSerializer.serialize(item) for item in obj]
            if isinstance(obj, tuple):
                return {"__type__": "tuple", "value": serialized}
            return serialized
        
        # Handle dictionaries
        if isinstance(obj, dict):
            return {k: TwinGraphSerializer.serialize(v) for k, v in obj.items()}
        
        # Handle dataclasses
        if hasattr(obj, '__dataclass_fields__'):
            return {
                "__type__": "dataclass",
                "__class__": f"{obj.__class__.__module__}.{obj.__class__.__name__}",
                "data": TwinGraphSerializer.serialize(asdict(obj))
            }
        
        # For other objects, try pickle with fallback to cloudpickle
        try:
            pickled = pickle.dumps(obj)
            return {
                "__type__": "pickle",
                "data": pickled.hex()
            }
        except:
            try:
                pickled = cloudpickle.dumps(obj)
                return {
                    "__type__": "cloudpickle",
                    "data": pickled.hex()
                }
            except:
                # Last resort: string representation
                return {
                    "__type__": "repr",
                    "value": repr(obj)
                }
    
    @staticmethod
    def deserialize(obj: Any) -> Any:
        """Deserialize from JSON-compatible format."""
        if obj is None:
            return None
        
        if isinstance(obj, dict) and "__type__" in obj:
            obj_type = obj["__type__"]
            
            if obj_type == "datetime":
                return datetime.fromisoformat(obj["value"])
            
            elif obj_type == "Path":
                return Path(obj["value"])
            
            elif obj_type == "numpy.ndarray":
                arr = np.array(obj["data"], dtype=obj["dtype"])
                return arr.reshape(obj["shape"])
            
            elif obj_type == "pandas.DataFrame":
                return pd.DataFrame(obj["data"], columns=obj["columns"])
            
            elif obj_type == "pandas.Series":
                return pd.Series(obj["data"], name=obj.get("name"))
            
            elif obj_type == "tuple":
                return tuple(TwinGraphSerializer.deserialize(item) for item in obj["value"])
            
            elif obj_type == "pickle":
                return pickle.loads(bytes.fromhex(obj["data"]))
            
            elif obj_type == "cloudpickle":
                return cloudpickle.loads(bytes.fromhex(obj["data"]))
            
            elif obj_type == "repr":
                return obj["value"]  # Can't reconstruct, return string
        
        # Handle nested structures
        if isinstance(obj, dict):
            return {k: TwinGraphSerializer.deserialize(v) for k, v in obj.items()}
        
        if isinstance(obj, list):
            return [TwinGraphSerializer.deserialize(item) for item in obj]
        
        return obj


def serialize_inputs(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize inputs dictionary to JSON-compatible format."""
    return TwinGraphSerializer.serialize(inputs)


def deserialize_inputs(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Deserialize inputs from JSON-compatible format."""
    return TwinGraphSerializer.deserialize(inputs)


# ============================================================================
# Hash Generation (improved)
# ============================================================================

def generate_hash(
    parent_hashes: List[str],
    func_name: str,
    inputs: Dict[str, Any],
    timestamp: Optional[datetime] = None
) -> str:
    """
    Generate deterministic hash for component execution.
    
    Inspired by content-addressable storage in Argo.
    """
    if timestamp is None:
        timestamp = datetime.utcnow()
    
    # Create deterministic hash components
    hash_components = {
        "parent_hashes": sorted(parent_hashes),  # Sort for consistency
        "function": func_name,
        "inputs": json.dumps(inputs, sort_keys=True),  # Deterministic JSON
        "timestamp": timestamp.isoformat()
    }
    
    # Generate hash
    hash_string = json.dumps(hash_components, sort_keys=True)
    return hashlib.sha256(hash_string.encode()).hexdigest()


# ============================================================================
# Configuration Resolution (inspired by all three)
# ============================================================================

def resolve_graph_config(
    decorator_config: Optional[Dict[str, Any]] = None,
    env_config: Optional[Dict[str, Any]] = None,
    default_config: Optional[Dict[str, Any]] = None
) -> GraphConfig:
    """
    Resolve configuration with precedence:
    1. Decorator config (highest priority)
    2. Environment config
    3. Default config (lowest priority)
    """
    # Start with defaults
    config = GraphConfig()
    
    # Apply default config
    if default_config:
        config = GraphConfig.from_dict(default_config)
    
    # Apply environment config
    env_config_obj = GraphConfig.from_env()
    if env_config_obj.endpoint != GraphConfig.endpoint:
        config = env_config_obj
    
    # Apply decorator config (highest priority)
    if decorator_config:
        for key, value in decorator_config.items():
            if hasattr(config, key):
                setattr(config, key, value)
            elif key == 'graph_endpoint':
                config.endpoint = value
    
    return config


# ============================================================================
# Error Handling (inspired by Metaflow)
# ============================================================================

class TwinGraphError(Exception):
    """Base exception with context."""
    
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.context = context or {}


def retry_with_backoff(
    func: Callable,
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: Tuple[type, ...] = (Exception,)
) -> Callable:
    """
    Decorator for retrying functions with exponential backoff.
    
    Inspired by Metaflow's robust error handling.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        delay = initial_delay
        last_exception = None
        
        for attempt in range(max_attempts):
            try:
                return func(*args, **kwargs)
            except exceptions as e:
                last_exception = e
                if attempt < max_attempts - 1:
                    time.sleep(delay + random.uniform(0, delay * 0.1))  # Add jitter
                    delay *= backoff_factor
        
        raise TwinGraphError(
            f"Failed after {max_attempts} attempts: {str(last_exception)}",
            context={
                "function": func.__name__,
                "attempts": max_attempts,
                "last_error": str(last_exception)
            }
        )
    
    return wrapper


# ============================================================================
# Backward Compatibility
# ============================================================================

def load_inputs(args, kwargs, argspec):
    """Backward compatible wrapper for robust_load_inputs."""
    serializable, runtime = robust_load_inputs(args, kwargs, argspec)
    
    # Format for backward compatibility
    input_vals = f"{args} {kwargs}"  # Simple string representation
    
    # Return in expected format
    return input_vals, runtime


# Export the improved set_gremlin_port_ip
def set_gremlin_port_ip(graph_config):
    """Get Gremlin endpoint from config."""
    config = resolve_graph_config(decorator_config=graph_config)
    return config.endpoint


# Keep other utility functions
def line_no(inp, target):
    """Find line number of target in input string."""
    inp = inp.split(target)
    line_no = len(inp[0].split('\n'))
    return line_no - 1


def set_randomize_time():
    """Add small random delay."""
    time.sleep(random.randint(0, 10000) / 10000000.0)


def set_hash(parent_hash):
    """Generate execution hash."""
    return generate_hash(parent_hash, "", {})


def set_AWS_ARN():
    """Get AWS ARN from environment or metadata."""
    # Check environment first
    arn = os.getenv('AWS_LAMBDA_FUNCTION_ARN')
    if arn:
        return arn
    
    # Try to get from EC2/ECS metadata
    try:
        import requests
        # This is a simplified version - real implementation would check multiple sources
        response = requests.get(
            'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
            timeout=1
        )
        if response.status_code == 200:
            return "arn:aws:iam::*:role/*"
    except:
        pass
    
    return 'Unknown'