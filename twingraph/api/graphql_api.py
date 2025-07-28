# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

"""
GraphQL API with subscriptions for real-time updates.
"""

from typing import AsyncIterator, Dict, Any, List, Optional
import asyncio
from datetime import datetime
import json

import strawberry
from strawberry.types import Info
from strawberry.subscriptions import GRAPHQL_TRANSPORT_WS_PROTOCOL
from strawberry.fastapi import GraphQLRouter

from ..core.logging import get_logger
from ..core.telemetry import trace_component
from .models import Workflow, Node, Edge, ExecutionStatus, NodeStatus

logger = get_logger(__name__)


# GraphQL Types
@strawberry.type
class GraphQLNode:
    id: str
    type: str
    position_x: float
    position_y: float
    data: strawberry.scalars.JSON
    status: Optional[str] = None
    
    @classmethod
    def from_model(cls, node: Node) -> "GraphQLNode":
        return cls(
            id=node.id,
            type=node.type,
            position_x=node.position.x,
            position_y=node.position.y,
            data=node.data.dict() if node.data else {},
            status=node.status.value if hasattr(node, 'status') else None
        )


@strawberry.type
class GraphQLEdge:
    id: str
    source: str
    target: str
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    
    @classmethod
    def from_model(cls, edge: Edge) -> "GraphQLEdge":
        return cls(
            id=edge.id,
            source=edge.source,
            target=edge.target,
            source_handle=edge.sourceHandle,
            target_handle=edge.targetHandle
        )


@strawberry.type
class GraphQLWorkflow:
    id: str
    name: str
    description: Optional[str]
    nodes: List[GraphQLNode]
    edges: List[GraphQLEdge]
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_model(cls, workflow: Workflow) -> "GraphQLWorkflow":
        return cls(
            id=workflow.id,
            name=workflow.name,
            description=workflow.description,
            nodes=[GraphQLNode.from_model(n) for n in workflow.nodes],
            edges=[GraphQLEdge.from_model(e) for e in workflow.edges],
            created_at=workflow.created_at,
            updated_at=workflow.updated_at
        )


@strawberry.type
class ExecutionUpdate:
    execution_id: str
    workflow_id: str
    status: str
    node_id: Optional[str] = None
    node_status: Optional[str] = None
    progress: Optional[float] = None
    message: Optional[str] = None
    timestamp: datetime = strawberry.field(default_factory=datetime.utcnow)
    data: Optional[strawberry.scalars.JSON] = None


@strawberry.type
class GraphVisualizationUpdate:
    execution_id: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    layout: Optional[str] = "hierarchical"
    timestamp: datetime = strawberry.field(default_factory=datetime.utcnow)


@strawberry.type
class MetricsUpdate:
    component_name: str
    execution_time: float
    memory_usage: Optional[float] = None
    cpu_usage: Optional[float] = None
    throughput: Optional[float] = None
    error_rate: Optional[float] = None
    timestamp: datetime = strawberry.field(default_factory=datetime.utcnow)


@strawberry.type
class LogEntry:
    level: str
    message: str
    component: str
    execution_id: Optional[str] = None
    metadata: Optional[strawberry.scalars.JSON] = None
    timestamp: datetime = strawberry.field(default_factory=datetime.utcnow)


# Event Manager for subscriptions
class EventManager:
    """Manages events for GraphQL subscriptions."""
    
    def __init__(self):
        self._subscribers: Dict[str, List[asyncio.Queue]] = {
            'execution': [],
            'graph': [],
            'metrics': [],
            'logs': []
        }
    
    async def publish_execution_update(self, update: ExecutionUpdate):
        """Publish execution update to all subscribers."""
        for queue in self._subscribers['execution']:
            await queue.put(update)
    
    async def publish_graph_update(self, update: GraphVisualizationUpdate):
        """Publish graph visualization update."""
        for queue in self._subscribers['graph']:
            await queue.put(update)
    
    async def publish_metrics_update(self, update: MetricsUpdate):
        """Publish metrics update."""
        for queue in self._subscribers['metrics']:
            await queue.put(update)
    
    async def publish_log_entry(self, entry: LogEntry):
        """Publish log entry."""
        for queue in self._subscribers['logs']:
            await queue.put(entry)
    
    def subscribe(self, event_type: str) -> asyncio.Queue:
        """Subscribe to an event type."""
        queue = asyncio.Queue()
        self._subscribers[event_type].append(queue)
        return queue
    
    def unsubscribe(self, event_type: str, queue: asyncio.Queue):
        """Unsubscribe from an event type."""
        if queue in self._subscribers[event_type]:
            self._subscribers[event_type].remove(queue)


# Global event manager
event_manager = EventManager()


# GraphQL Queries
@strawberry.type
class Query:
    @strawberry.field
    @trace_component("graphql_query")
    async def workflow(self, workflow_id: str) -> Optional[GraphQLWorkflow]:
        """Get a specific workflow by ID."""
        # This would fetch from database
        # Placeholder for demonstration
        workflow = Workflow(
            id=workflow_id,
            name="Sample Workflow",
            nodes=[],
            edges=[]
        )
        return GraphQLWorkflow.from_model(workflow)
    
    @strawberry.field
    @trace_component("graphql_query")
    async def workflows(
        self,
        limit: int = 10,
        offset: int = 0
    ) -> List[GraphQLWorkflow]:
        """List workflows with pagination."""
        # This would fetch from database
        # Placeholder for demonstration
        return []
    
    @strawberry.field
    @trace_component("graphql_query")
    async def execution_status(
        self,
        execution_id: str
    ) -> Optional[ExecutionUpdate]:
        """Get current execution status."""
        # This would fetch from execution manager
        return ExecutionUpdate(
            execution_id=execution_id,
            workflow_id="workflow-1",
            status="running",
            progress=0.5
        )
    
    @strawberry.field
    async def component_metrics(
        self,
        component_name: str,
        time_range: int = 3600  # seconds
    ) -> List[MetricsUpdate]:
        """Get component metrics for time range."""
        # This would query metrics store
        return []


# GraphQL Mutations
@strawberry.type
class Mutation:
    @strawberry.mutation
    @trace_component("graphql_mutation")
    async def create_workflow(
        self,
        name: str,
        description: Optional[str] = None
    ) -> GraphQLWorkflow:
        """Create a new workflow."""
        workflow = Workflow(
            id=f"workflow-{datetime.utcnow().timestamp()}",
            name=name,
            description=description,
            nodes=[],
            edges=[]
        )
        return GraphQLWorkflow.from_model(workflow)
    
    @strawberry.mutation
    @trace_component("graphql_mutation")
    async def execute_workflow(
        self,
        workflow_id: str,
        parameters: Optional[strawberry.scalars.JSON] = None
    ) -> ExecutionUpdate:
        """Execute a workflow."""
        execution_id = f"exec-{datetime.utcnow().timestamp()}"
        
        # Publish initial update
        update = ExecutionUpdate(
            execution_id=execution_id,
            workflow_id=workflow_id,
            status="started",
            message="Workflow execution started"
        )
        await event_manager.publish_execution_update(update)
        
        return update
    
    @strawberry.mutation
    async def stop_execution(
        self,
        execution_id: str
    ) -> ExecutionUpdate:
        """Stop a running execution."""
        update = ExecutionUpdate(
            execution_id=execution_id,
            workflow_id="unknown",
            status="stopped",
            message="Execution stopped by user"
        )
        await event_manager.publish_execution_update(update)
        
        return update


# GraphQL Subscriptions
@strawberry.type
class Subscription:
    @strawberry.subscription
    async def execution_updates(
        self,
        execution_id: Optional[str] = None,
        workflow_id: Optional[str] = None
    ) -> AsyncIterator[ExecutionUpdate]:
        """
        Subscribe to execution updates.
        
        Can filter by execution_id or workflow_id.
        """
        queue = event_manager.subscribe('execution')
        
        try:
            while True:
                update = await queue.get()
                
                # Apply filters
                if execution_id and update.execution_id != execution_id:
                    continue
                if workflow_id and update.workflow_id != workflow_id:
                    continue
                
                yield update
        finally:
            event_manager.unsubscribe('execution', queue)
    
    @strawberry.subscription
    async def graph_visualization(
        self,
        execution_id: str
    ) -> AsyncIterator[GraphVisualizationUpdate]:
        """
        Subscribe to real-time graph visualization updates.
        
        Provides node positions, statuses, and connections.
        """
        queue = event_manager.subscribe('graph')
        
        # Send initial graph state
        initial = GraphVisualizationUpdate(
            execution_id=execution_id,
            nodes=[],
            edges=[]
        )
        yield initial
        
        try:
            while True:
                update = await queue.get()
                
                if update.execution_id == execution_id:
                    yield update
        finally:
            event_manager.unsubscribe('graph', queue)
    
    @strawberry.subscription
    async def component_metrics_stream(
        self,
        component_names: Optional[List[str]] = None
    ) -> AsyncIterator[MetricsUpdate]:
        """
        Subscribe to real-time component metrics.
        
        Can filter by component names.
        """
        queue = event_manager.subscribe('metrics')
        
        try:
            while True:
                update = await queue.get()
                
                # Apply filter
                if component_names and update.component_name not in component_names:
                    continue
                
                yield update
        finally:
            event_manager.unsubscribe('metrics', queue)
    
    @strawberry.subscription
    async def log_stream(
        self,
        execution_id: Optional[str] = None,
        component: Optional[str] = None,
        min_level: str = "INFO"
    ) -> AsyncIterator[LogEntry]:
        """
        Subscribe to real-time log stream.
        
        Can filter by execution_id, component, and minimum log level.
        """
        queue = event_manager.subscribe('logs')
        
        level_priority = {
            "DEBUG": 0,
            "INFO": 1,
            "WARNING": 2,
            "ERROR": 3,
            "CRITICAL": 4
        }
        min_priority = level_priority.get(min_level, 1)
        
        try:
            while True:
                entry = await queue.get()
                
                # Apply filters
                if execution_id and entry.execution_id != execution_id:
                    continue
                if component and entry.component != component:
                    continue
                if level_priority.get(entry.level, 0) < min_priority:
                    continue
                
                yield entry
        finally:
            event_manager.unsubscribe('logs', queue)
    
    @strawberry.subscription
    async def workflow_changes(
        self,
        workflow_id: str
    ) -> AsyncIterator[GraphQLWorkflow]:
        """
        Subscribe to workflow definition changes.
        
        Useful for collaborative editing.
        """
        # This would connect to workflow change events
        # Placeholder implementation
        while True:
            await asyncio.sleep(5)
            
            # Simulate workflow change
            workflow = Workflow(
                id=workflow_id,
                name="Updated Workflow",
                nodes=[],
                edges=[],
                updated_at=datetime.utcnow()
            )
            
            yield GraphQLWorkflow.from_model(workflow)


# Create GraphQL schema
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=Subscription
)

# Create GraphQL router for FastAPI
graphql_router = GraphQLRouter(
    schema,
    subscription_protocols=[GRAPHQL_TRANSPORT_WS_PROTOCOL]
)


# Helper functions to publish events
async def publish_node_status_update(
    execution_id: str,
    workflow_id: str,
    node_id: str,
    status: NodeStatus,
    message: Optional[str] = None
):
    """Publish node status update."""
    update = ExecutionUpdate(
        execution_id=execution_id,
        workflow_id=workflow_id,
        status="running",
        node_id=node_id,
        node_status=status.value,
        message=message
    )
    await event_manager.publish_execution_update(update)


async def publish_execution_progress(
    execution_id: str,
    workflow_id: str,
    progress: float,
    message: Optional[str] = None
):
    """Publish execution progress update."""
    update = ExecutionUpdate(
        execution_id=execution_id,
        workflow_id=workflow_id,
        status="running",
        progress=progress,
        message=message
    )
    await event_manager.publish_execution_update(update)


async def publish_component_metrics(
    component_name: str,
    execution_time: float,
    **kwargs
):
    """Publish component metrics."""
    update = MetricsUpdate(
        component_name=component_name,
        execution_time=execution_time,
        **kwargs
    )
    await event_manager.publish_metrics_update(update)


# Export main components
__all__ = [
    'schema',
    'graphql_router',
    'event_manager',
    'publish_node_status_update',
    'publish_execution_progress',
    'publish_component_metrics'
]