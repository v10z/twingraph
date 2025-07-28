"""
Enhanced graph management for TwinGraph.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Union
from contextlib import contextmanager

from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
from gremlin_python.structure.graph import Graph
from gremlin_python.process.graph_traversal import __
from gremlin_python.process.traversal import Cardinality

from ..core.exceptions import GraphConnectionError, GraphOperationError

logger = logging.getLogger(__name__)


class GraphManager:
    """Manages connections and operations with the graph database."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.endpoint = config.get('graph_endpoint', 'ws://localhost:8182')
        self.graph_type = config.get('graph_type', 'tinkergraph')
        self.connection_pool_size = config.get('connection_pool_size', 10)
        self._connection = None
        self._graph = None
        self._g = None
    
    @property
    def g(self):
        """Get graph traversal source."""
        if self._g is None:
            self._connect()
        return self._g
    
    def _connect(self):
        """Establish connection to graph database."""
        try:
            self._connection = DriverRemoteConnection(
                self.endpoint,
                'g',
                pool_size=self.connection_pool_size
            )
            self._graph = Graph()
            self._g = self._graph.traversal().withRemote(self._connection)
            
            # Test connection
            self._g.V().limit(1).toList()
            
            logger.info(f"Connected to graph database at {self.endpoint}")
            
        except Exception as e:
            raise GraphConnectionError(
                f"Failed to connect to graph database at {self.endpoint}",
                cause=e
            )
    
    def disconnect(self):
        """Close connection to graph database."""
        if self._connection:
            try:
                self._connection.close()
                logger.info("Disconnected from graph database")
            except Exception as e:
                logger.warning(f"Error closing graph connection: {e}")
            finally:
                self._connection = None
                self._graph = None
                self._g = None
    
    @contextmanager
    def transaction(self):
        """Context manager for graph transactions."""
        tx = self.g.tx()
        try:
            yield tx
            tx.commit()
        except Exception:
            tx.rollback()
            raise
    
    def clear_graph(self):
        """Clear all vertices and edges from the graph."""
        try:
            count = self.g.V().count().next()
            self.g.V().drop().iterate()
            logger.info(f"Cleared {count} vertices from graph")
        except Exception as e:
            raise GraphOperationError("Failed to clear graph", cause=e)
    
    def add_component_execution(
        self,
        attributes: Dict[str, Any],
        parent_hashes: List[str]
    ) -> str:
        """Add component execution to graph."""
        try:
            # Ensure required attributes
            required = ['Name', 'ExecutionID', 'Hash']
            missing = [attr for attr in required if attr not in attributes]
            if missing:
                raise ValueError(f"Missing required attributes: {missing}")
            
            # Create vertex
            vertex_id = self._add_vertex('Component', attributes)
            
            # Add edges to parents
            for parent_hash in parent_hashes:
                self._add_edge(parent_hash, attributes['Hash'], 'DEPENDS_ON')
            
            logger.debug(
                f"Added component execution: {attributes['Name']} "
                f"(hash: {attributes['Hash']})"
            )
            
            return vertex_id
            
        except Exception as e:
            raise GraphOperationError(
                f"Failed to add component execution: {attributes.get('Name')}",
                cause=e
            )
    
    def add_pipeline_node(self, attributes: Dict[str, Any]) -> str:
        """Add pipeline node to graph."""
        try:
            vertex_id = self._add_vertex('Pipeline', attributes)
            
            logger.debug(
                f"Added pipeline node: {attributes['Name']} "
                f"(id: {attributes.get('PipelineID')})"
            )
            
            return vertex_id
            
        except Exception as e:
            raise GraphOperationError(
                f"Failed to add pipeline node: {attributes.get('Name')}",
                cause=e
            )
    
    def _add_vertex(self, label: str, properties: Dict[str, Any]) -> str:
        """Add vertex with properties."""
        # Build traversal
        traversal = self.g.addV(label)
        
        for key, value in properties.items():
            # Handle different value types
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            elif value is None:
                continue
            
            traversal = traversal.property(key, value)
        
        # Execute and get vertex ID
        vertex = traversal.next()
        return str(vertex.id)
    
    def _add_edge(self, from_hash: str, to_hash: str, label: str):
        """Add edge between vertices identified by hash."""
        self.g.V().has('Hash', from_hash).as_('from').V().has(
            'Hash', to_hash
        ).as_('to').addE(label).from_('from').to('to').iterate()
    
    def get_component_by_hash(self, hash_value: str) -> Optional[Dict[str, Any]]:
        """Get component by hash value."""
        try:
            vertices = self.g.V().has('Hash', hash_value).elementMap().toList()
            
            if not vertices:
                return None
            
            # Convert to dictionary
            result = {}
            for key, value in vertices[0].items():
                if isinstance(value, str) and value.startswith('{'):
                    try:
                        result[key] = json.loads(value)
                    except json.JSONDecodeError:
                        result[key] = value
                else:
                    result[key] = value
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get component by hash {hash_value}: {e}")
            return None
    
    def get_execution_graph(
        self,
        start_hash: str,
        max_depth: int = 10
    ) -> Dict[str, Any]:
        """Get execution graph starting from a component."""
        try:
            # Get all connected vertices up to max_depth
            paths = self.g.V().has('Hash', start_hash).repeat(
                __.out().simplePath()
            ).until(
                __.loops().is_(max_depth)
            ).path().by(__.elementMap()).toList()
            
            # Build graph structure
            nodes = {}
            edges = []
            
            for path in paths:
                for i, node in enumerate(path):
                    node_id = str(node.get('Hash', node.get('id')))
                    if node_id not in nodes:
                        nodes[node_id] = self._process_node(node)
                    
                    if i > 0:
                        prev_id = str(path[i-1].get('Hash', path[i-1].get('id')))
                        edges.append({
                            'from': prev_id,
                            'to': node_id,
                            'label': 'DEPENDS_ON'
                        })
            
            return {
                'nodes': nodes,
                'edges': edges
            }
            
        except Exception as e:
            raise GraphOperationError(
                f"Failed to get execution graph from {start_hash}",
                cause=e
            )
    
    def _process_node(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Process node data for return."""
        processed = {}
        
        for key, value in node.items():
            if isinstance(value, str) and value.startswith('{'):
                try:
                    processed[key] = json.loads(value)
                except json.JSONDecodeError:
                    processed[key] = value
            else:
                processed[key] = value
        
        return processed
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get graph statistics."""
        try:
            stats = {
                'total_vertices': self.g.V().count().next(),
                'total_edges': self.g.E().count().next(),
                'components': self.g.V().hasLabel('Component').count().next(),
                'pipelines': self.g.V().hasLabel('Pipeline').count().next(),
                'platforms': {}
            }
            
            # Get platform distribution
            platforms = self.g.V().hasLabel('Component').groupCount().by(
                'Platform'
            ).next()
            
            stats['platforms'] = platforms
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get graph statistics: {e}")
            return {}
    
    def search_components(
        self,
        name: Optional[str] = None,
        platform: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        execution_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Search for components with filters."""
        try:
            traversal = self.g.V().hasLabel('Component')
            
            if name:
                traversal = traversal.has('Name', name)
            
            if platform:
                traversal = traversal.has('Platform', platform)
            
            if start_time:
                traversal = traversal.has('StartTime', __.gte(start_time))
            
            if end_time:
                traversal = traversal.has('StartTime', __.lte(end_time))
            
            if execution_id:
                traversal = traversal.has('ExecutionID', execution_id)
            
            results = traversal.limit(limit).elementMap().toList()
            
            return [self._process_node(node) for node in results]
            
        except Exception as e:
            logger.error(f"Failed to search components: {e}")
            return []