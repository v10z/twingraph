# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import json
import asyncio
import uuid
import os
from datetime import datetime

from ..orchestration.orchestration_tools import component, pipeline
from ..core.workflow_engine import WorkflowEngine
from ..graph.graph_manager import GraphManager
from .models import Workflow, ExecutionRequest, ExecutionStatus, NodeStatus
from .graphql_api import graphql_router, publish_node_status_update, publish_execution_progress
from ..core.telemetry import initialize_telemetry, trace_component

# Initialize telemetry
telemetry = initialize_telemetry(service_name="twingraph-api")

app = FastAPI(title="TwinGraph API", version="2.0.0")

# Add GraphQL endpoint
app.include_router(graphql_router, prefix="/graphql")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (replace with database in production)
workflows_db: Dict[str, Workflow] = {}
executions_db: Dict[str, ExecutionStatus] = {}
websocket_connections: Dict[str, List[WebSocket]] = {}

workflow_engine = WorkflowEngine()

# Get graph endpoint from environment or use default
graph_endpoint = os.getenv('TWINGRAPH_GREMLIN_ENDPOINT', 'ws://localhost:8182')
graph_manager = GraphManager({'graph_endpoint': graph_endpoint})

@app.get("/")
async def root():
    return {"message": "TwinGraph API v2.0"}

@app.get("/api/workflows")
async def list_workflows():
    return list(workflows_db.values())

@app.get("/api/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    if workflow_id not in workflows_db:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflows_db[workflow_id]

@app.post("/api/workflows/{workflow_id}")
async def save_workflow(workflow_id: str, workflow: Workflow):
    workflows_db[workflow_id] = workflow
    return {"message": "Workflow saved successfully"}

@app.delete("/api/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    if workflow_id not in workflows_db:
        raise HTTPException(status_code=404, detail="Workflow not found")
    del workflows_db[workflow_id]
    return {"message": "Workflow deleted successfully"}

@app.post("/api/executions")
async def execute_workflow(request: ExecutionRequest):
    execution_id = str(uuid.uuid4())
    
    if request.workflow_id not in workflows_db and not request.workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow = request.workflow or workflows_db[request.workflow_id]
    
    # Initialize execution status
    execution_status = ExecutionStatus(
        workflow_id=workflow.id,
        execution_id=execution_id,
        status="pending",
        start_time=datetime.now().isoformat(),
        nodes={}
    )
    
    for node in workflow.nodes:
        execution_status.nodes[node.id] = NodeStatus(
            node_id=node.id,
            status="pending"
        )
    
    executions_db[execution_id] = execution_status
    
    # Start execution in background
    asyncio.create_task(run_workflow_async(execution_id, workflow))
    
    return {"execution_id": execution_id}

@app.get("/api/executions/{execution_id}")
async def get_execution_status(execution_id: str):
    if execution_id not in executions_db:
        raise HTTPException(status_code=404, detail="Execution not found")
    return executions_db[execution_id]

@app.post("/api/executions/{execution_id}/cancel")
async def cancel_execution(execution_id: str):
    if execution_id not in executions_db:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    execution = executions_db[execution_id]
    execution.status = "cancelled"
    execution.end_time = datetime.now().isoformat()
    
    await notify_execution_update(execution_id, execution)
    
    return {"message": "Execution cancelled"}

# Graph API endpoints
@app.get("/api/graph/execution/{execution_id}")
async def get_execution_graph(execution_id: str):
    """Get the graph for a specific execution."""
    try:
        # Get all nodes related to this execution
        nodes = graph_manager.search_components(execution_id=execution_id)
        
        # Build graph structure
        graph_data = {
            'nodes': {},
            'edges': []
        }
        
        for node in nodes:
            node_id = node.get('Hash', node.get('ExecutionID'))
            graph_data['nodes'][node_id] = node
            
            # Add edges based on parent hashes
            if 'ParentHashes' in node:
                parent_hashes = json.loads(node['ParentHashes']) if isinstance(node['ParentHashes'], str) else node['ParentHashes']
                for parent_hash in parent_hashes:
                    graph_data['edges'].append({
                        'from': parent_hash,
                        'to': node_id,
                        'type': 'DEPENDS_ON'
                    })
        
        return graph_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/graph/component/{component_hash}")
async def get_component_graph(component_hash: str, max_depth: int = 10):
    """Get the graph starting from a specific component."""
    try:
        graph_data = graph_manager.get_execution_graph(component_hash, max_depth)
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/graph/full")
async def get_full_graph(limit: int = 100):
    """Get the full graph with optional limit."""
    try:
        components = graph_manager.search_components(limit=limit)
        
        graph_data = {
            'nodes': {},
            'edges': []
        }
        
        for component in components:
            node_id = component.get('Hash', str(component.get('id')))
            graph_data['nodes'][node_id] = component
            
            # Add edges
            if 'ParentHashes' in component:
                parent_hashes = json.loads(component['ParentHashes']) if isinstance(component['ParentHashes'], str) else component['ParentHashes']
                for parent_hash in parent_hashes:
                    graph_data['edges'].append({
                        'from': parent_hash,
                        'to': node_id,
                        'type': 'DEPENDS_ON'
                    })
        
        return graph_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/graph/statistics")
async def get_graph_statistics():
    """Get graph statistics."""
    try:
        stats = graph_manager.get_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/graph/gremlin")
async def execute_gremlin_query(request: Dict[str, str]):
    """Execute a Gremlin query on the graph database."""
    query = request.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    try:
        # This would execute against the actual TinkerGraph/Neptune instance
        # For now, return mock data based on query
        if "g.V()" in query:
            # Return all vertices
            return {
                "vertices": [
                    {
                        "id": "node1",
                        "label": "Component A",
                        "properties": {"Platform": "Docker", "Type": "component"}
                    },
                    {
                        "id": "node2", 
                        "label": "Component B",
                        "properties": {"Platform": "Lambda", "Type": "component"}
                    }
                ],
                "edges": [
                    {
                        "id": "edge1",
                        "from": "node1",
                        "to": "node2",
                        "label": "connects"
                    }
                ]
            }
        else:
            return {"vertices": [], "edges": []}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/graph/search")
async def search_components(
    name: Optional[str] = None,
    platform: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    limit: int = 100
):
    """Search for components with filters."""
    try:
        components = graph_manager.search_components(
            name=name,
            platform=platform,
            start_time=start_time,
            end_time=end_time,
            limit=limit
        )
        return components
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "subscribe":
                execution_id = data["execution_id"]
                if execution_id not in websocket_connections:
                    websocket_connections[execution_id] = []
                websocket_connections[execution_id].append(websocket)
            
            elif data["type"] == "unsubscribe":
                execution_id = data["execution_id"]
                if execution_id in websocket_connections:
                    websocket_connections[execution_id].remove(websocket)
    
    except Exception as e:
        # Clean up connections
        for execution_id, connections in websocket_connections.items():
            if websocket in connections:
                connections.remove(websocket)

async def run_workflow_async(execution_id: str, workflow: Workflow):
    """Execute workflow using TwinGraph engine"""
    execution = executions_db[execution_id]
    execution.status = "running"
    
    await notify_execution_update(execution_id, execution)
    
    try:
        # Convert workflow to TwinGraph format and execute
        result = await workflow_engine.execute(workflow, execution_id)
        
        execution.status = "completed"
        execution.end_time = datetime.now().isoformat()
        
    except Exception as e:
        execution.status = "failed"
        execution.end_time = datetime.now().isoformat()
        execution.error = str(e)
    
    await notify_execution_update(execution_id, execution)

async def notify_execution_update(execution_id: str, execution: ExecutionStatus):
    """Notify all subscribed websockets about execution updates"""
    if execution_id in websocket_connections:
        for websocket in websocket_connections[execution_id]:
            try:
                await websocket.send_json({
                    "type": f"execution:{execution_id}",
                    "data": execution.dict()
                })
            except:
                # Remove dead connections
                websocket_connections[execution_id].remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)