# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

"""
Plugin system for extending TwinGraph with custom executors and components.
"""

import importlib
import importlib.util
from typing import Dict, Any, List, Optional, Type, Protocol, runtime_checkable
from pathlib import Path
import inspect
import yaml
import json
from abc import ABC, abstractmethod

from .logging import get_logger
from .exceptions import TwinGraphError

logger = get_logger(__name__)


@runtime_checkable
class PluginInterface(Protocol):
    """Protocol that all plugins must implement."""
    
    name: str
    version: str
    description: str
    author: str
    
    def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize the plugin with configuration."""
        ...
    
    def get_executors(self) -> Dict[str, Type["ExecutorPlugin"]]:
        """Return available executors from this plugin."""
        ...
    
    def get_components(self) -> Dict[str, Any]:
        """Return available components from this plugin."""
        ...
    
    def cleanup(self) -> None:
        """Cleanup resources when plugin is unloaded."""
        ...


class ExecutorPlugin(ABC):
    """Base class for custom executor plugins."""
    
    @abstractmethod
    async def execute(
        self,
        code: str,
        inputs: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute code with given inputs and configuration."""
        pass
    
    @abstractmethod
    def get_supported_languages(self) -> List[str]:
        """Return list of supported languages/formats."""
        pass
    
    @abstractmethod
    def validate_code(self, code: str) -> bool:
        """Validate if code is valid for this executor."""
        pass


class PluginManager:
    """Manages loading, registration, and lifecycle of plugins."""
    
    def __init__(self, plugin_dir: Optional[Path] = None):
        self.plugin_dir = plugin_dir or Path.home() / ".twingraph" / "plugins"
        self.plugin_dir.mkdir(parents=True, exist_ok=True)
        
        self._plugins: Dict[str, PluginInterface] = {}
        self._executors: Dict[str, ExecutorPlugin] = {}
        self._components: Dict[str, Any] = {}
        self._hooks: Dict[str, List[callable]] = {
            'pre_execution': [],
            'post_execution': [],
            'on_error': [],
            'on_component_register': []
        }
    
    def discover_plugins(self) -> List[str]:
        """Discover available plugins in the plugin directory."""
        discovered = []
        
        # Check for Python plugins
        for path in self.plugin_dir.glob("*.py"):
            if path.stem != "__init__":
                discovered.append(path.stem)
        
        # Check for plugin packages
        for path in self.plugin_dir.iterdir():
            if path.is_dir() and (path / "__init__.py").exists():
                discovered.append(path.name)
        
        # Check for plugin manifests
        for path in self.plugin_dir.glob("*.yaml"):
            discovered.append(path.stem)
        
        logger.info(f"Discovered {len(discovered)} plugins: {discovered}")
        return discovered
    
    def load_plugin(self, plugin_name: str, config: Optional[Dict[str, Any]] = None) -> None:
        """Load a plugin by name."""
        if plugin_name in self._plugins:
            logger.warning(f"Plugin {plugin_name} already loaded")
            return
        
        config = config or {}
        
        # Try loading as Python module
        plugin = self._load_python_plugin(plugin_name)
        
        if not plugin:
            # Try loading from manifest
            plugin = self._load_manifest_plugin(plugin_name)
        
        if not plugin:
            raise TwinGraphError(f"Could not load plugin: {plugin_name}")
        
        # Validate plugin interface
        if not isinstance(plugin, PluginInterface):
            raise TwinGraphError(
                f"Plugin {plugin_name} does not implement PluginInterface"
            )
        
        # Initialize plugin
        plugin.initialize(config)
        
        # Register plugin
        self._plugins[plugin_name] = plugin
        
        # Register executors
        executors = plugin.get_executors()
        for name, executor_class in executors.items():
            full_name = f"{plugin_name}.{name}"
            self._executors[full_name] = executor_class()
            logger.info(f"Registered executor: {full_name}")
        
        # Register components
        components = plugin.get_components()
        for name, component in components.items():
            full_name = f"{plugin_name}.{name}"
            self._components[full_name] = component
            logger.info(f"Registered component: {full_name}")
            
            # Run hooks
            for hook in self._hooks['on_component_register']:
                hook(full_name, component)
        
        logger.info(f"Successfully loaded plugin: {plugin_name}")
    
    def _load_python_plugin(self, plugin_name: str) -> Optional[PluginInterface]:
        """Load a Python-based plugin."""
        try:
            # Check if it's a file
            plugin_file = self.plugin_dir / f"{plugin_name}.py"
            if plugin_file.exists():
                spec = importlib.util.spec_from_file_location(
                    plugin_name, plugin_file
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
            else:
                # Try as package
                plugin_package = self.plugin_dir / plugin_name
                if plugin_package.exists():
                    spec = importlib.util.spec_from_file_location(
                        plugin_name,
                        plugin_package / "__init__.py"
                    )
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                else:
                    return None
            
            # Find plugin class
            for name, obj in inspect.getmembers(module):
                if (
                    inspect.isclass(obj) and
                    issubclass(obj, PluginInterface) and
                    obj is not PluginInterface
                ):
                    return obj()
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to load Python plugin {plugin_name}: {e}")
            return None
    
    def _load_manifest_plugin(self, plugin_name: str) -> Optional[PluginInterface]:
        """Load a plugin from YAML/JSON manifest."""
        manifest_path = None
        
        for ext in ['.yaml', '.yml', '.json']:
            path = self.plugin_dir / f"{plugin_name}{ext}"
            if path.exists():
                manifest_path = path
                break
        
        if not manifest_path:
            return None
        
        try:
            # Load manifest
            with open(manifest_path) as f:
                if manifest_path.suffix == '.json':
                    manifest = json.load(f)
                else:
                    manifest = yaml.safe_load(f)
            
            # Create dynamic plugin class
            class ManifestPlugin:
                def __init__(self):
                    self.name = manifest.get('name', plugin_name)
                    self.version = manifest.get('version', '1.0.0')
                    self.description = manifest.get('description', '')
                    self.author = manifest.get('author', 'Unknown')
                    self._manifest = manifest
                
                def initialize(self, config: Dict[str, Any]) -> None:
                    # Run initialization commands if specified
                    if 'init_commands' in self._manifest:
                        for cmd in self._manifest['init_commands']:
                            # Execute initialization commands
                            pass
                
                def get_executors(self) -> Dict[str, Type[ExecutorPlugin]]:
                    # Load executors from manifest
                    executors = {}
                    
                    for executor_config in self._manifest.get('executors', []):
                        name = executor_config['name']
                        executor_type = executor_config['type']
                        
                        if executor_type == 'docker':
                            executors[name] = self._create_docker_executor(
                                executor_config
                            )
                        elif executor_type == 'wasm':
                            executors[name] = self._create_wasm_executor(
                                executor_config
                            )
                    
                    return executors
                
                def get_components(self) -> Dict[str, Any]:
                    # Load components from manifest
                    return self._manifest.get('components', {})
                
                def cleanup(self) -> None:
                    # Run cleanup commands if specified
                    if 'cleanup_commands' in self._manifest:
                        for cmd in self._manifest['cleanup_commands']:
                            # Execute cleanup commands
                            pass
                
                def _create_docker_executor(self, config: Dict[str, Any]) -> Type[ExecutorPlugin]:
                    """Create Docker-based executor from config."""
                    class DockerExecutor(ExecutorPlugin):
                        def __init__(self):
                            self.image = config['image']
                            self.languages = config.get('languages', ['any'])
                        
                        async def execute(
                            self,
                            code: str,
                            inputs: Dict[str, Any],
                            config: Dict[str, Any]
                        ) -> Dict[str, Any]:
                            # Execute in Docker container
                            # Placeholder implementation
                            return {'result': 'executed in docker'}
                        
                        def get_supported_languages(self) -> List[str]:
                            return self.languages
                        
                        def validate_code(self, code: str) -> bool:
                            return True
                    
                    return DockerExecutor
                
                def _create_wasm_executor(self, config: Dict[str, Any]) -> Type[ExecutorPlugin]:
                    """Create WASM-based executor from config."""
                    class WasmExecutor(ExecutorPlugin):
                        def __init__(self):
                            self.runtime = config.get('runtime', 'wasmtime')
                            self.languages = config.get('languages', ['wasm'])
                        
                        async def execute(
                            self,
                            code: str,
                            inputs: Dict[str, Any],
                            config: Dict[str, Any]
                        ) -> Dict[str, Any]:
                            # Execute WASM module
                            # Placeholder implementation
                            return {'result': 'executed in wasm'}
                        
                        def get_supported_languages(self) -> List[str]:
                            return self.languages
                        
                        def validate_code(self, code: str) -> bool:
                            # Validate WASM module
                            return code.startswith(b'\x00asm')
                    
                    return WasmExecutor
            
            return ManifestPlugin()
            
        except Exception as e:
            logger.error(f"Failed to load manifest plugin {plugin_name}: {e}")
            return None
    
    def unload_plugin(self, plugin_name: str) -> None:
        """Unload a plugin and cleanup resources."""
        if plugin_name not in self._plugins:
            logger.warning(f"Plugin {plugin_name} not loaded")
            return
        
        plugin = self._plugins[plugin_name]
        
        # Cleanup plugin
        plugin.cleanup()
        
        # Remove executors
        executors_to_remove = [
            name for name in self._executors
            if name.startswith(f"{plugin_name}.")
        ]
        for name in executors_to_remove:
            del self._executors[name]
        
        # Remove components
        components_to_remove = [
            name for name in self._components
            if name.startswith(f"{plugin_name}.")
        ]
        for name in components_to_remove:
            del self._components[name]
        
        # Remove plugin
        del self._plugins[plugin_name]
        
        logger.info(f"Unloaded plugin: {plugin_name}")
    
    def get_executor(self, name: str) -> Optional[ExecutorPlugin]:
        """Get an executor by name."""
        return self._executors.get(name)
    
    def get_component(self, name: str) -> Optional[Any]:
        """Get a component by name."""
        return self._components.get(name)
    
    def list_executors(self) -> List[str]:
        """List all available executors."""
        return list(self._executors.keys())
    
    def list_components(self) -> List[str]:
        """List all available components."""
        return list(self._components.keys())
    
    def register_hook(self, event: str, callback: callable) -> None:
        """Register a hook for plugin events."""
        if event in self._hooks:
            self._hooks[event].append(callback)
        else:
            logger.warning(f"Unknown hook event: {event}")
    
    async def execute_hooks(self, event: str, *args, **kwargs) -> None:
        """Execute all hooks for an event."""
        for hook in self._hooks.get(event, []):
            try:
                if inspect.iscoroutinefunction(hook):
                    await hook(*args, **kwargs)
                else:
                    hook(*args, **kwargs)
            except Exception as e:
                logger.error(f"Hook execution failed: {e}")


# Example plugin implementations

class RustExecutorPlugin(ExecutorPlugin):
    """Example Rust executor plugin."""
    
    async def execute(
        self,
        code: str,
        inputs: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Rust code."""
        # This would compile and run Rust code
        # Placeholder implementation
        return {
            'output': f"Rust execution result for: {code[:50]}...",
            'exit_code': 0
        }
    
    def get_supported_languages(self) -> List[str]:
        return ['rust', 'rs']
    
    def validate_code(self, code: str) -> bool:
        # Basic validation
        return 'fn main()' in code or 'pub fn' in code


class JuliaExecutorPlugin(ExecutorPlugin):
    """Example Julia executor plugin."""
    
    async def execute(
        self,
        code: str,
        inputs: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Julia code."""
        # This would run Julia code
        # Placeholder implementation
        return {
            'output': f"Julia execution result",
            'arrays': [[1, 2, 3], [4, 5, 6]]
        }
    
    def get_supported_languages(self) -> List[str]:
        return ['julia', 'jl']
    
    def validate_code(self, code: str) -> bool:
        return True


class ExamplePlugin:
    """Example plugin implementation."""
    
    def __init__(self):
        self.name = "example_plugin"
        self.version = "1.0.0"
        self.description = "Example plugin showing plugin system capabilities"
        self.author = "TwinGraph Team"
    
    def initialize(self, config: Dict[str, Any]) -> None:
        logger.info(f"Initializing {self.name} with config: {config}")
    
    def get_executors(self) -> Dict[str, Type[ExecutorPlugin]]:
        return {
            'rust': RustExecutorPlugin,
            'julia': JuliaExecutorPlugin
        }
    
    def get_components(self) -> Dict[str, Any]:
        return {
            'data_processor': self._create_data_processor(),
            'ml_pipeline': self._create_ml_pipeline()
        }
    
    def cleanup(self) -> None:
        logger.info(f"Cleaning up {self.name}")
    
    def _create_data_processor(self):
        """Create a data processing component."""
        from ..orchestration.modern_decorators import async_component
        
        @async_component(platform='local')
        async def process_data(data: List[float]) -> Dict[str, float]:
            """Example data processing component from plugin."""
            return {
                'mean': sum(data) / len(data),
                'max': max(data),
                'min': min(data)
            }
        
        return process_data
    
    def _create_ml_pipeline(self):
        """Create an ML pipeline component."""
        from ..orchestration.modern_decorators import async_component
        
        @async_component(platform='gpu')
        async def ml_pipeline(dataset: str, model: str) -> Dict[str, Any]:
            """Example ML pipeline component from plugin."""
            return {
                'model': model,
                'accuracy': 0.95,
                'dataset': dataset
            }
        
        return ml_pipeline


# Global plugin manager
_plugin_manager: Optional[PluginManager] = None


def get_plugin_manager() -> PluginManager:
    """Get global plugin manager instance."""
    global _plugin_manager
    if _plugin_manager is None:
        _plugin_manager = PluginManager()
    return _plugin_manager


# Export main components
__all__ = [
    'PluginInterface',
    'ExecutorPlugin',
    'PluginManager',
    'get_plugin_manager'
]