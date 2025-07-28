# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

import asyncio
from typing import Dict, Any, List, Optional
from collections import namedtuple
import json
import inspect
import ast

from ..api.models import Workflow, Node, Edge, NodeStatus
from ..orchestration.orchestration_tools import component, pipeline
from .languages import LanguageExecutor, PythonExecutor, BashExecutor, JavaScriptExecutor
from .plugins import get_plugin_manager

class WorkflowEngine:
    def __init__(self):
        self.executors: Dict[str, LanguageExecutor] = {
            'python': PythonExecutor(),
            'bash': BashExecutor(),
            'javascript': JavaScriptExecutor(),
        }
        self.execution_context: Dict[str, Any] = {}
        self.plugin_manager = get_plugin_manager()
        
        # Auto-discover and load plugins
        self._load_plugins()
        
    async def execute(self, workflow: Workflow, execution_id: str) -> Dict[str, Any]:
        """Execute a workflow and return results"""
        # Build execution graph
        graph = self._build_execution_graph(workflow)
        
        # Initialize execution context
        self.execution_context[execution_id] = {
            'nodes': {},
            'results': {},
            'status': 'running'
        }
        
        # Execute nodes in topological order
        execution_order = self._topological_sort(graph)
        
        for node_id in execution_order:
            node = self._get_node_by_id(workflow, node_id)
            if node:
                await self._execute_node(node, workflow, execution_id)
        
        return self.execution_context[execution_id]['results']
    
    def _build_execution_graph(self, workflow: Workflow) -> Dict[str, List[str]]:
        """Build adjacency list representation of workflow"""
        graph = {node.id: [] for node in workflow.nodes}
        
        for edge in workflow.edges:
            if edge.source in graph:
                graph[edge.source].append(edge.target)
        
        return graph
    
    def _topological_sort(self, graph: Dict[str, List[str]]) -> List[str]:
        """Perform topological sort on the workflow graph"""
        visited = set()
        stack = []
        
        def dfs(node: str):
            visited.add(node)
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    dfs(neighbor)
            stack.append(node)
        
        for node in graph:
            if node not in visited:
                dfs(node)
        
        return stack[::-1]
    
    def _get_node_by_id(self, workflow: Workflow, node_id: str) -> Optional[Node]:
        """Get node by ID from workflow"""
        for node in workflow.nodes:
            if node.id == node_id:
                return node
        return None
    
    async def _execute_node(self, node: Node, workflow: Workflow, execution_id: str):
        """Execute a single node"""
        context = self.execution_context[execution_id]
        
        # Update node status
        context['nodes'][node.id] = {
            'status': 'running',
            'start_time': asyncio.get_event_loop().time()
        }
        
        try:
            # Get inputs from connected nodes
            inputs = self._gather_inputs(node, workflow, execution_id)
            
            # Execute based on node type
            if node.type == 'component':
                result = await self._execute_component(node, inputs)
            else:
                result = inputs
            
            # Store results
            context['results'][node.id] = result
            context['nodes'][node.id]['status'] = 'completed'
            context['nodes'][node.id]['output'] = result
            
        except Exception as e:
            context['nodes'][node.id]['status'] = 'failed'
            context['nodes'][node.id]['error'] = str(e)
            raise
    
    def _gather_inputs(self, node: Node, workflow: Workflow, execution_id: str) -> Dict[str, Any]:
        """Gather inputs from connected nodes"""
        inputs = {}
        context = self.execution_context[execution_id]
        
        # Find edges targeting this node
        for edge in workflow.edges:
            if edge.target == node.id:
                source_result = context['results'].get(edge.source, {})
                
                # Map output to input based on handles
                if edge.target_handle and edge.source_handle:
                    inputs[edge.target_handle] = source_result.get(edge.source_handle)
                else:
                    inputs.update(source_result)
        
        return inputs
    
    async def _execute_component(self, node: Node, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a component node"""
        language = node.data.language or 'python'
        code = node.data.code or ''
        
        # Check built-in executors first
        if language in self.executors:
            executor = self.executors[language]
        else:
            # Check plugin executors
            plugin_executor = None
            for executor_name in self.plugin_manager.list_executors():
                plugin_exec = self.plugin_manager.get_executor(executor_name)
                if language in plugin_exec.get_supported_languages():
                    plugin_executor = plugin_exec
                    break
            
            if not plugin_executor:
                raise ValueError(f"Unsupported language: {language}")
            
            executor = plugin_executor
        
        # Prepare execution config
        config = {
            'timeout': node.data.config.timeout if node.data.config else 30,
            'environment': node.data.config.environment if node.data.config else {},
        }
        
        # Execute code
        result = await executor.execute(code, inputs, config)
        
        # Convert to TwinGraph compatible format
        if language == 'python':
            # Wrap in namedtuple format expected by TwinGraph
            outputs = namedtuple('outputs', list(result.keys()))
            return outputs(**result)._asdict()
        
        return result
    
    def generate_twingraph_code(self, workflow: Workflow) -> str:
        """Generate TwinGraph-compatible Python code from workflow"""
        code_lines = [
            "from typing import NamedTuple",
            "from collections import namedtuple",
            "from twingraph import component, pipeline",
            "",
        ]
        
        # Generate component functions
        for node in workflow.nodes:
            if node.type == 'component':
                code_lines.extend(self._generate_component_code(node))
                code_lines.append("")
        
        # Generate pipeline function
        code_lines.extend(self._generate_pipeline_code(workflow))
        
        return "\n".join(code_lines)
    
    def _generate_component_code(self, node: Node) -> List[str]:
        """Generate component function code"""
        func_name = node.data.label.replace(" ", "_").lower()
        
        # Extract inputs from node data
        input_params = []
        for inp in node.data.inputs or []:
            param = f"{inp.name}: {self._type_to_python(inp.type)}"
            if not inp.required:
                param += f" = {inp.default}"
            input_params.append(param)
        
        lines = [
            f"@component()",
            f"def {func_name}({', '.join(input_params)}) -> NamedTuple:",
        ]
        
        # Add the actual code or a placeholder
        if node.data.code:
            # Indent the code properly
            code_lines = node.data.code.split('\n')
            for line in code_lines:
                if line.strip():
                    lines.append(f"    {line}")
        else:
            lines.extend([
                "    # Component implementation",
                "    outputs = namedtuple('outputs', ['result'])",
                "    return outputs(None)"
            ])
        
        return lines
    
    def _generate_pipeline_code(self, workflow: Workflow) -> List[str]:
        """Generate pipeline function code"""
        lines = [
            "@pipeline()",
            f"def {workflow.name.replace(' ', '_').lower()}():",
        ]
        
        # Track node outputs for referencing
        node_vars = {}
        
        # Generate node instantiations in topological order
        graph = self._build_execution_graph(workflow)
        execution_order = self._topological_sort(graph)
        
        for node_id in execution_order:
            node = self._get_node_by_id(workflow, node_id)
            if node and node.type == 'component':
                var_name = f"node_{node_id.replace('-', '_')}"
                node_vars[node_id] = var_name
                
                # Find parent nodes
                parents = []
                for edge in workflow.edges:
                    if edge.target == node_id and edge.source in node_vars:
                        parents.append(node_vars[edge.source])
                
                # Generate function call
                func_name = node.data.label.replace(" ", "_").lower()
                
                if parents:
                    parent_hash = f"[{', '.join(p + \"['hash']\" for p in parents)}]"
                    lines.append(f"    {var_name} = {func_name}(parent_hash={parent_hash})")
                else:
                    lines.append(f"    {var_name} = {func_name}()")
        
        lines.append("")
        lines.append(f"{workflow.name.replace(' ', '_').lower()}()")
        
        return lines
    
    def _type_to_python(self, type_str: str) -> str:
        """Convert type string to Python type annotation"""
        type_map = {
            'string': 'str',
            'number': 'float',
            'boolean': 'bool',
            'object': 'Dict[str, Any]',
            'array': 'List[Any]',
            'any': 'Any'
        }
        return type_map.get(type_str, 'Any')
    
    def _load_plugins(self):
        """Load available plugins."""
        try:
            # Discover plugins
            plugins = self.plugin_manager.discover_plugins()
            
            # Load each plugin
            for plugin_name in plugins:
                try:
                    self.plugin_manager.load_plugin(plugin_name)
                except Exception as e:
                    print(f"Failed to load plugin {plugin_name}: {e}")
        except Exception as e:
            print(f"Plugin discovery failed: {e}")