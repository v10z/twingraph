# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

class PortDefinition(BaseModel):
    id: str
    name: str
    type: Literal["string", "number", "boolean", "object", "array", "any"]
    required: Optional[bool] = False
    default: Optional[Any] = None
    description: Optional[str] = None

class ComponentType(BaseModel):
    id: str
    name: str
    category: Literal["genai", "data", "compute", "io", "control", "custom"]
    icon: Optional[str] = None
    description: Optional[str] = None
    default_code: Optional[str] = None
    supported_languages: List[str]

class NodeConfig(BaseModel):
    compute: Optional[Dict[str, Any]] = None
    retry: Optional[Dict[str, Any]] = None
    timeout: Optional[int] = None
    environment: Optional[Dict[str, str]] = None

class NodeData(BaseModel):
    label: str
    component_type: Optional[ComponentType] = None
    code: Optional[str] = None
    language: Optional[str] = "python"
    inputs: Optional[List[PortDefinition]] = []
    outputs: Optional[List[PortDefinition]] = []
    config: Optional[NodeConfig] = None

class Node(BaseModel):
    id: str
    type: Literal["component", "input", "output"]
    position: Dict[str, float]
    data: NodeData

class Edge(BaseModel):
    id: str
    source: str
    target: str
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    type: Optional[Literal["default", "animated"]] = "default"
    data: Optional[Dict[str, Any]] = None

class WorkflowMetadata(BaseModel):
    created: str
    modified: str
    author: str
    version: str
    tags: Optional[List[str]] = []

class Workflow(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    nodes: List[Node]
    edges: List[Edge]
    metadata: WorkflowMetadata

class ExecutionRequest(BaseModel):
    workflow_id: str
    workflow: Optional[Workflow] = None
    parameters: Optional[Dict[str, Any]] = {}

class NodeStatus(BaseModel):
    node_id: str
    status: Literal["pending", "running", "completed", "failed", "skipped"]
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    output: Optional[Any] = None
    error: Optional[str] = None
    logs: Optional[List[str]] = []

class ExecutionStatus(BaseModel):
    workflow_id: str
    execution_id: str
    status: Literal["pending", "running", "completed", "failed", "cancelled"]
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    nodes: Dict[str, NodeStatus]
    error: Optional[str] = None