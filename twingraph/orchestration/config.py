"""
Configuration classes for TwinGraph orchestration.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class ComponentConfig:
    """Configuration for component execution."""
    platform_config: Dict[str, Any] = field(default_factory=dict)
    docker_image: Optional[str] = None
    timeout: Optional[int] = None
    auto_retry: bool = True
    max_retries: int = 3
    
    # Platform-specific configs
    kubernetes_config: Optional[Dict[str, Any]] = None
    lambda_config: Optional[Dict[str, Any]] = None
    batch_config: Optional[Dict[str, Any]] = None
    
    def get_platform_config(self, platform: str) -> Dict[str, Any]:
        """Get configuration for specific platform."""
        platform_configs = {
            'kubernetes': self.kubernetes_config,
            'lambda': self.lambda_config,
            'batch': self.batch_config
        }
        
        config = self.platform_config.copy()
        specific_config = platform_configs.get(platform)
        
        if specific_config:
            config.update(specific_config)
        
        return config


@dataclass
class PipelineConfig:
    """Configuration for pipeline execution."""
    name: str
    celery_enabled: bool = False
    celery_config: Dict[str, Any] = field(default_factory=dict)
    distributed: bool = False
    monitoring_enabled: bool = True
    
    # Celery-specific settings
    celery_broker: str = 'redis://localhost:6379/1'
    celery_backend: str = 'redis://localhost:6379/0'
    celery_concurrency: int = 32
    celery_task_dir: str = '/tmp'
    
    # Graph settings
    clear_graph_on_start: bool = True
    record_intermediate_results: bool = True
    
    # Execution settings
    parallel_execution: bool = True
    max_parallel_tasks: int = 10
    task_timeout: int = 3600  # 1 hour default
    
    def get_celery_config(self) -> Dict[str, Any]:
        """Get Celery configuration."""
        config = self.celery_config.copy()
        config.update({
            'broker_url': self.celery_broker,
            'result_backend': self.celery_backend,
            'worker_concurrency': self.celery_concurrency,
            'task_default_queue': f'{self.name}_queue',
            'task_default_routing_key': f'{self.name}_routing',
            'task_time_limit': self.task_timeout,
            'task_soft_time_limit': int(self.task_timeout * 0.9)
        })
        return config


@dataclass
class TwinGraphConfig:
    """Global TwinGraph configuration."""
    # Graph database settings
    graph_endpoint: str = 'ws://localhost:8182'
    graph_type: str = 'tinkergraph'  # 'tinkergraph' or 'neptune'
    
    # Execution settings
    default_platform: str = 'local'
    enable_monitoring: bool = True
    enable_tracing: bool = True
    
    # Storage settings
    artifact_storage: str = 'local'  # 'local', 's3', 'gcs'
    artifact_path: str = '/tmp/twingraph/artifacts'
    
    # Security settings
    enable_encryption: bool = False
    encryption_key: Optional[str] = None
    
    # Performance settings
    connection_pool_size: int = 10
    request_timeout: int = 30
    
    # Logging settings
    log_level: str = 'INFO'
    log_format: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    @classmethod
    def from_file(cls, config_path: str) -> 'TwinGraphConfig':
        """Load configuration from file."""
        import json
        import yaml
        
        with open(config_path, 'r') as f:
            if config_path.endswith('.json'):
                data = json.load(f)
            elif config_path.endswith(('.yaml', '.yml')):
                data = yaml.safe_load(f)
            else:
                raise ValueError(f"Unsupported config format: {config_path}")
        
        return cls(**data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return {
            k: v for k, v in self.__dict__.items()
            if not k.startswith('_')
        }