# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

"""
OpenTelemetry instrumentation for distributed tracing and metrics.
"""

from typing import Dict, Any, Optional, Callable, TypeVar
import functools
from contextlib import contextmanager
from datetime import datetime

from opentelemetry import trace, metrics
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.trace import Status, StatusCode
from opentelemetry.metrics import CallbackOptions, Observation
import opentelemetry.instrumentation.redis
import opentelemetry.instrumentation.celery
import opentelemetry.instrumentation.fastapi
import opentelemetry.instrumentation.httpx

from .logging import get_logger

logger = get_logger(__name__)

T = TypeVar('T')


class TelemetryManager:
    """Manages OpenTelemetry instrumentation for TwinGraph."""
    
    def __init__(
        self,
        service_name: str = "twingraph",
        otlp_endpoint: Optional[str] = None,
        enabled: bool = True
    ):
        self.service_name = service_name
        self.otlp_endpoint = otlp_endpoint or "localhost:4317"
        self.enabled = enabled
        self._initialized = False
        
        if self.enabled:
            self._initialize()
    
    def _initialize(self):
        """Initialize OpenTelemetry providers."""
        # Create resource
        resource = Resource.create({
            "service.name": self.service_name,
            "service.version": "2.0.0",
            "deployment.environment": "production"
        })
        
        # Initialize tracing
        self._init_tracing(resource)
        
        # Initialize metrics
        self._init_metrics(resource)
        
        # Auto-instrument libraries
        self._auto_instrument()
        
        self._initialized = True
        logger.info(f"OpenTelemetry initialized for {self.service_name}")
    
    def _init_tracing(self, resource: Resource):
        """Initialize tracing provider."""
        # Create OTLP exporter
        otlp_exporter = OTLPSpanExporter(
            endpoint=self.otlp_endpoint,
            insecure=True
        )
        
        # Create tracer provider
        provider = TracerProvider(resource=resource)
        processor = BatchSpanProcessor(otlp_exporter)
        provider.add_span_processor(processor)
        
        # Set global tracer provider
        trace.set_tracer_provider(provider)
        
        # Get tracer
        self.tracer = trace.get_tracer(__name__)
    
    def _init_metrics(self, resource: Resource):
        """Initialize metrics provider."""
        # Create OTLP exporter
        otlp_exporter = OTLPMetricExporter(
            endpoint=self.otlp_endpoint,
            insecure=True
        )
        
        # Create metric reader
        reader = PeriodicExportingMetricReader(
            exporter=otlp_exporter,
            export_interval_millis=60000  # Export every minute
        )
        
        # Create meter provider
        provider = MeterProvider(
            resource=resource,
            metric_readers=[reader]
        )
        
        # Set global meter provider
        metrics.set_meter_provider(provider)
        
        # Get meter
        self.meter = metrics.get_meter(__name__)
        
        # Create common metrics
        self._create_metrics()
    
    def _create_metrics(self):
        """Create common metrics for monitoring."""
        # Component execution counter
        self.component_counter = self.meter.create_counter(
            name="twingraph.component.executions",
            description="Number of component executions",
            unit="1"
        )
        
        # Component execution duration
        self.component_duration = self.meter.create_histogram(
            name="twingraph.component.duration",
            description="Component execution duration",
            unit="ms"
        )
        
        # Active workflows gauge
        self.active_workflows = self.meter.create_up_down_counter(
            name="twingraph.workflows.active",
            description="Number of active workflows",
            unit="1"
        )
        
        # Error counter
        self.error_counter = self.meter.create_counter(
            name="twingraph.errors",
            description="Number of errors",
            unit="1"
        )
        
        # Queue size (for Celery)
        self.meter.create_observable_gauge(
            name="twingraph.queue.size",
            callbacks=[self._get_queue_size],
            description="Size of task queue",
            unit="1"
        )
    
    def _get_queue_size(self, options: CallbackOptions) -> Observation:
        """Callback to get queue size."""
        # This would query actual queue size
        # Placeholder for demonstration
        return Observation(42, {"queue": "default"})
    
    def _auto_instrument(self):
        """Auto-instrument common libraries."""
        # Redis
        opentelemetry.instrumentation.redis.RedisInstrumentor().instrument()
        
        # Celery
        opentelemetry.instrumentation.celery.CeleryInstrumentor().instrument()
        
        # FastAPI
        opentelemetry.instrumentation.fastapi.FastAPIInstrumentor().instrument()
        
        # HTTP client
        opentelemetry.instrumentation.httpx.HTTPXClientInstrumentor().instrument()
    
    @contextmanager
    def span(
        self,
        name: str,
        attributes: Optional[Dict[str, Any]] = None,
        kind: trace.SpanKind = trace.SpanKind.INTERNAL
    ):
        """Create a traced span."""
        if not self.enabled:
            yield None
            return
        
        with self.tracer.start_as_current_span(
            name,
            kind=kind,
            attributes=attributes or {}
        ) as span:
            try:
                yield span
            except Exception as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)
                raise
    
    def trace_component(
        self,
        component_type: str = "generic"
    ) -> Callable[[Callable[..., T]], Callable[..., T]]:
        """Decorator to trace component execution."""
        def decorator(func: Callable[..., T]) -> Callable[..., T]:
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs) -> T:
                if not self.enabled:
                    return await func(*args, **kwargs)
                
                start_time = datetime.utcnow()
                
                with self.span(
                    f"component.{func.__name__}",
                    attributes={
                        "component.type": component_type,
                        "component.name": func.__name__,
                        "component.module": func.__module__,
                    }
                ) as span:
                    try:
                        # Record execution
                        self.component_counter.add(
                            1,
                            {"component": func.__name__, "type": component_type}
                        )
                        
                        # Execute function
                        result = await func(*args, **kwargs)
                        
                        # Record duration
                        duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                        self.component_duration.record(
                            duration,
                            {"component": func.__name__, "type": component_type}
                        )
                        
                        # Add result info to span
                        if hasattr(result, '__len__'):
                            span.set_attribute("result.size", len(result))
                        
                        return result
                        
                    except Exception as e:
                        # Record error
                        self.error_counter.add(
                            1,
                            {
                                "component": func.__name__,
                                "type": component_type,
                                "error": type(e).__name__
                            }
                        )
                        raise
            
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs) -> T:
                if not self.enabled:
                    return func(*args, **kwargs)
                
                start_time = datetime.utcnow()
                
                with self.span(
                    f"component.{func.__name__}",
                    attributes={
                        "component.type": component_type,
                        "component.name": func.__name__,
                        "component.module": func.__module__,
                    }
                ) as span:
                    try:
                        # Record execution
                        self.component_counter.add(
                            1,
                            {"component": func.__name__, "type": component_type}
                        )
                        
                        # Execute function
                        result = func(*args, **kwargs)
                        
                        # Record duration
                        duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                        self.component_duration.record(
                            duration,
                            {"component": func.__name__, "type": component_type}
                        )
                        
                        return result
                        
                    except Exception as e:
                        # Record error
                        self.error_counter.add(
                            1,
                            {
                                "component": func.__name__,
                                "type": component_type,
                                "error": type(e).__name__
                            }
                        )
                        raise
            
            # Return appropriate wrapper
            import inspect
            if inspect.iscoroutinefunction(func):
                return async_wrapper
            else:
                return sync_wrapper
        
        return decorator
    
    def trace_workflow(self, workflow_id: str):
        """Context manager for tracing entire workflow execution."""
        @contextmanager
        def workflow_context():
            if not self.enabled:
                yield
                return
            
            # Increment active workflows
            self.active_workflows.add(1, {"workflow_id": workflow_id})
            
            with self.span(
                f"workflow.{workflow_id}",
                attributes={
                    "workflow.id": workflow_id,
                    "workflow.start_time": datetime.utcnow().isoformat()
                },
                kind=trace.SpanKind.SERVER
            ) as span:
                try:
                    yield span
                finally:
                    # Decrement active workflows
                    self.active_workflows.add(-1, {"workflow_id": workflow_id})
        
        return workflow_context()
    
    def record_custom_metric(
        self,
        name: str,
        value: float,
        labels: Optional[Dict[str, str]] = None,
        unit: str = "1"
    ):
        """Record a custom metric."""
        if not self.enabled:
            return
        
        # Create metric if it doesn't exist
        if not hasattr(self, f"custom_{name}"):
            metric = self.meter.create_histogram(
                name=f"twingraph.custom.{name}",
                description=f"Custom metric: {name}",
                unit=unit
            )
            setattr(self, f"custom_{name}", metric)
        
        # Record value
        metric = getattr(self, f"custom_{name}")
        metric.record(value, labels or {})


# Global telemetry instance
_telemetry_manager: Optional[TelemetryManager] = None


def initialize_telemetry(
    service_name: str = "twingraph",
    otlp_endpoint: Optional[str] = None,
    enabled: bool = True
) -> TelemetryManager:
    """Initialize global telemetry manager."""
    global _telemetry_manager
    
    if _telemetry_manager is None:
        _telemetry_manager = TelemetryManager(
            service_name=service_name,
            otlp_endpoint=otlp_endpoint,
            enabled=enabled
        )
    
    return _telemetry_manager


def get_telemetry() -> TelemetryManager:
    """Get global telemetry manager."""
    if _telemetry_manager is None:
        return initialize_telemetry()
    return _telemetry_manager


# Convenience decorators
def trace_component(component_type: str = "generic"):
    """Decorator to trace component execution."""
    return get_telemetry().trace_component(component_type)


# Export main components
__all__ = [
    'TelemetryManager',
    'initialize_telemetry',
    'get_telemetry',
    'trace_component'
]