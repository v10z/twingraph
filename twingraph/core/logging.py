# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

"""
Logging and monitoring utilities for TwinGraph.
"""

import logging
import json
import time
from datetime import datetime
from typing import Any, Dict, Optional, Callable
from functools import wraps
import os
from pathlib import Path

# Create logs directory
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)


class TwinGraphLogger:
    """Enhanced logger for TwinGraph with structured logging."""
    
    def __init__(self, name: str, level: str = "INFO"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, level.upper()))
        
        # Remove existing handlers
        self.logger.handlers = []
        
        # Console handler with color
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = ColoredFormatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
        
        # File handler with JSON format
        file_handler = logging.FileHandler(
            LOGS_DIR / f"twingraph_{datetime.now().strftime('%Y%m%d')}.log"
        )
        file_handler.setLevel(logging.DEBUG)
        file_formatter = JsonFormatter()
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)
        
        # Metrics file handler
        metrics_handler = logging.FileHandler(
            LOGS_DIR / f"twingraph_metrics_{datetime.now().strftime('%Y%m%d')}.jsonl"
        )
        metrics_handler.setLevel(logging.INFO)
        metrics_handler.addFilter(MetricsFilter())
        metrics_handler.setFormatter(JsonFormatter())
        self.logger.addHandler(metrics_handler)
    
    def log_execution(
        self,
        component: str,
        execution_id: str,
        status: str,
        duration: float,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log component execution with metrics."""
        self.logger.info(
            f"Component execution: {component}",
            extra={
                'execution_id': execution_id,
                'component': component,
                'status': status,
                'duration': duration,
                'metadata': metadata or {},
                'metric_type': 'execution'
            }
        )
    
    def log_error(
        self,
        component: str,
        error: Exception,
        execution_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log component error with context."""
        self.logger.error(
            f"Component error in {component}: {str(error)}",
            extra={
                'execution_id': execution_id,
                'component': component,
                'error_type': type(error).__name__,
                'error_message': str(error),
                'metadata': metadata or {},
                'metric_type': 'error'
            },
            exc_info=True
        )


class ColoredFormatter(logging.Formatter):
    """Colored formatter for console output."""
    
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{log_color}{record.levelname}{self.RESET}"
        return super().format(record)


class JsonFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'created', 'filename',
                          'funcName', 'levelname', 'levelno', 'lineno',
                          'module', 'msecs', 'message', 'pathname', 'process',
                          'processName', 'relativeCreated', 'thread',
                          'threadName', 'exc_info', 'exc_text', 'stack_info']:
                log_data[key] = value
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


class MetricsFilter(logging.Filter):
    """Filter to only log metrics."""
    
    def filter(self, record):
        return hasattr(record, 'metric_type')


def monitor_performance(logger: Optional[TwinGraphLogger] = None):
    """Decorator to monitor function performance."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            execution_id = kwargs.get('execution_id', 'unknown')
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                if logger:
                    logger.log_execution(
                        component=func.__name__,
                        execution_id=execution_id,
                        status='success',
                        duration=duration,
                        metadata={
                            'args_count': len(args),
                            'kwargs_keys': list(kwargs.keys())
                        }
                    )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                if logger:
                    logger.log_error(
                        component=func.__name__,
                        error=e,
                        execution_id=execution_id,
                        metadata={
                            'duration': duration,
                            'args_count': len(args),
                            'kwargs_keys': list(kwargs.keys())
                        }
                    )
                
                raise
        
        return wrapper
    return decorator


class ExecutionMonitor:
    """Monitor for tracking execution metrics."""
    
    def __init__(self):
        self.metrics = {
            'total_executions': 0,
            'successful_executions': 0,
            'failed_executions': 0,
            'total_duration': 0.0,
            'component_metrics': {},
            'platform_metrics': {},
            'error_counts': {}
        }
        self.logger = TwinGraphLogger('ExecutionMonitor')
    
    def record_execution(
        self,
        component: str,
        platform: str,
        duration: float,
        success: bool,
        error_type: Optional[str] = None
    ):
        """Record execution metrics."""
        self.metrics['total_executions'] += 1
        self.metrics['total_duration'] += duration
        
        if success:
            self.metrics['successful_executions'] += 1
        else:
            self.metrics['failed_executions'] += 1
            if error_type:
                self.metrics['error_counts'][error_type] = \
                    self.metrics['error_counts'].get(error_type, 0) + 1
        
        # Component metrics
        if component not in self.metrics['component_metrics']:
            self.metrics['component_metrics'][component] = {
                'executions': 0,
                'successes': 0,
                'failures': 0,
                'total_duration': 0.0
            }
        
        comp_metrics = self.metrics['component_metrics'][component]
        comp_metrics['executions'] += 1
        comp_metrics['total_duration'] += duration
        if success:
            comp_metrics['successes'] += 1
        else:
            comp_metrics['failures'] += 1
        
        # Platform metrics
        if platform not in self.metrics['platform_metrics']:
            self.metrics['platform_metrics'][platform] = {
                'executions': 0,
                'total_duration': 0.0
            }
        
        plat_metrics = self.metrics['platform_metrics'][platform]
        plat_metrics['executions'] += 1
        plat_metrics['total_duration'] += duration
    
    def get_summary(self) -> Dict[str, Any]:
        """Get execution summary."""
        if self.metrics['total_executions'] == 0:
            return self.metrics
        
        summary = self.metrics.copy()
        summary['success_rate'] = (
            self.metrics['successful_executions'] / 
            self.metrics['total_executions']
        )
        summary['average_duration'] = (
            self.metrics['total_duration'] / 
            self.metrics['total_executions']
        )
        
        # Component summaries
        for comp, comp_metrics in summary['component_metrics'].items():
            if comp_metrics['executions'] > 0:
                comp_metrics['success_rate'] = (
                    comp_metrics['successes'] / comp_metrics['executions']
                )
                comp_metrics['average_duration'] = (
                    comp_metrics['total_duration'] / comp_metrics['executions']
                )
        
        # Platform summaries
        for plat, plat_metrics in summary['platform_metrics'].items():
            if plat_metrics['executions'] > 0:
                plat_metrics['average_duration'] = (
                    plat_metrics['total_duration'] / plat_metrics['executions']
                )
        
        return summary
    
    def save_metrics(self, filepath: Optional[str] = None):
        """Save metrics to file."""
        if filepath is None:
            filepath = LOGS_DIR / f"metrics_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(filepath, 'w') as f:
            json.dump(self.get_summary(), f, indent=2)
        
        self.logger.logger.info(f"Metrics saved to {filepath}")


# Global monitor instance
global_monitor = ExecutionMonitor()


def get_logger(name: str) -> TwinGraphLogger:
    """Get a logger instance."""
    return TwinGraphLogger(name)


def configure_logging(
    level: str = "INFO",
    log_dir: Optional[str] = None,
    enable_metrics: bool = True
):
    """Configure global logging settings."""
    global LOGS_DIR
    
    if log_dir:
        LOGS_DIR = Path(log_dir)
        LOGS_DIR.mkdir(exist_ok=True)
    
    # Set root logger level
    logging.getLogger().setLevel(getattr(logging, level.upper()))
    
    # Configure metrics
    if not enable_metrics:
        # Remove metrics filter from all handlers
        for handler in logging.getLogger().handlers:
            handler.removeFilter(MetricsFilter)