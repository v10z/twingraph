# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

"""
Custom exceptions for TwinGraph.
"""

from typing import Any, Dict, Optional


class TwinGraphError(Exception):
    """Base exception for all TwinGraph errors."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.cause = cause
    
    def __str__(self):
        base_msg = self.message
        if self.details:
            base_msg += f" | Details: {self.details}"
        if self.cause:
            base_msg += f" | Caused by: {type(self.cause).__name__}: {str(self.cause)}"
        return base_msg


class ComponentError(TwinGraphError):
    """Base exception for component-related errors."""
    pass


class ComponentExecutionError(ComponentError):
    """Raised when component execution fails."""
    
    def __init__(
        self,
        message: str,
        component_name: Optional[str] = None,
        execution_id: Optional[str] = None,
        platform: Optional[str] = None,
        **kwargs
    ):
        details = {
            'component_name': component_name,
            'execution_id': execution_id,
            'platform': platform
        }
        details.update(kwargs)
        super().__init__(message, details)


class ComponentValidationError(ComponentError):
    """Raised when component validation fails."""
    pass


class PipelineError(TwinGraphError):
    """Base exception for pipeline-related errors."""
    pass


class PipelineExecutionError(PipelineError):
    """Raised when pipeline execution fails."""
    
    def __init__(
        self,
        message: str,
        pipeline_name: Optional[str] = None,
        pipeline_id: Optional[str] = None,
        failed_component: Optional[str] = None,
        **kwargs
    ):
        details = {
            'pipeline_name': pipeline_name,
            'pipeline_id': pipeline_id,
            'failed_component': failed_component
        }
        details.update(kwargs)
        super().__init__(message, details)


class PipelineValidationError(PipelineError):
    """Raised when pipeline validation fails."""
    pass


class PlatformError(TwinGraphError):
    """Base exception for platform-related errors."""
    pass


class PlatformExecutionError(PlatformError):
    """Raised when platform execution fails."""
    pass


class PlatformConfigurationError(PlatformError):
    """Raised when platform configuration is invalid."""
    pass


class GraphError(TwinGraphError):
    """Base exception for graph database errors."""
    pass


class GraphConnectionError(GraphError):
    """Raised when connection to graph database fails."""
    pass


class GraphOperationError(GraphError):
    """Raised when graph operation fails."""
    pass


class ConfigurationError(TwinGraphError):
    """Raised when configuration is invalid."""
    pass


class RetryableError(TwinGraphError):
    """Base class for retryable errors."""
    
    def __init__(
        self,
        message: str,
        retry_after: Optional[int] = None,
        max_retries: Optional[int] = None,
        **kwargs
    ):
        details = {
            'retry_after': retry_after,
            'max_retries': max_retries
        }
        details.update(kwargs)
        super().__init__(message, details)


class NetworkError(RetryableError):
    """Raised for network-related errors."""
    pass


class ResourceError(RetryableError):
    """Raised for resource-related errors."""
    pass


class TimeoutError(TwinGraphError):
    """Raised when operation times out."""
    
    def __init__(
        self,
        message: str,
        timeout: Optional[float] = None,
        operation: Optional[str] = None,
        **kwargs
    ):
        details = {
            'timeout': timeout,
            'operation': operation
        }
        details.update(kwargs)
        super().__init__(message, details)