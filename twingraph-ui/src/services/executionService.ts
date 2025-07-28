import { Node, Edge } from 'reactflow';
import { graphService } from './graphService';

export interface ExecutionResult {
  success: boolean;
  outputs?: Record<string, any>;
  error?: string;
  graphData?: GraphExecutionData;
}

export interface GraphExecutionData {
  vertices: GraphVertex[];
  edges: GraphEdge[];
}

export interface GraphVertex {
  id: string;
  label: string;
  properties: {
    hash: string;
    name: string;
    timestamp: string;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    parent_hash?: string[];
    status: 'pending' | 'running' | 'completed' | 'failed';
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: 'parent_of';
}

// Simulate component execution
const executeComponent = async (
  componentName: string,
  code: string,
  inputs: Record<string, any>,
  parentHashes: string[]
): Promise<{ outputs: Record<string, any>; hash: string }> => {
  // Generate unique hash for this execution
  const hash = `${componentName}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Simulate execution delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Parse function to extract return values
  const functionMatch = code.match(/def\s+(\w+)\s*\([^)]*\):/);
  const functionName = functionMatch ? functionMatch[1] : componentName;
  
  // Simulate outputs based on component type
  let outputs: Record<string, any> = {};
  
  if (code.includes('return') && code.includes('outputs(')) {
    // Extract output fields from namedtuple
    const outputsMatch = code.match(/outputs\s*=\s*namedtuple\s*\(\s*['"]outputs['"]\s*,\s*\[([^\]]+)\]/);
    if (outputsMatch) {
      const fields = outputsMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
      fields.forEach(field => {
        // Generate sample data based on field name
        if (field.includes('sum')) {
          outputs[field] = Object.values(inputs).reduce((a: any, b: any) => 
            typeof a === 'number' && typeof b === 'number' ? a + b : 0, 0);
        } else if (field.includes('result')) {
          outputs[field] = { processed: true, data: inputs };
        } else {
          outputs[field] = `${field}_value_${hash.substring(0, 8)}`;
        }
      });
    }
  } else {
    // Default output
    outputs = { result: inputs };
  }
  
  return { outputs, hash };
};

export const executePipeline = async (
  code: string,
  nodes: Node[],
  edges: Edge[],
  onProgress?: (message: string, graphData?: GraphExecutionData) => void
): Promise<ExecutionResult> => {
  try {
    onProgress?.('Starting pipeline execution...');
    
    const vertices: GraphVertex[] = [];
    const graphEdges: GraphEdge[] = [];
    const componentResults = new Map<string, { outputs: Record<string, any>; hash: string }>();
    
    // Find start node
    const startNode = nodes.find(n => n.type === 'start');
    if (startNode) {
      const startHash = '1'; // Start node always has hash '1'
      componentResults.set(startNode.id, { outputs: { value: 1 }, hash: startHash });
      
      vertices.push({
        id: startHash,
        label: 'START',
        properties: {
          hash: startHash,
          name: 'START',
          timestamp: new Date().toISOString(),
          outputs: { value: 1 },
          parent_hash: [],
          status: 'completed'
        }
      });
    }
    
    // Build execution order based on edges
    const executionOrder: Node[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) {
        throw new Error('Circular dependency detected');
      }
      
      visiting.add(nodeId);
      
      // Visit all dependencies first
      const incomingEdges = edges.filter(e => e.target === nodeId);
      for (const edge of incomingEdges) {
        visit(edge.source);
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      
      const node = nodes.find(n => n.id === nodeId);
      if (node && node.type === 'component') {
        executionOrder.push(node);
      }
    };
    
    // Visit all nodes
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    });
    
    // Execute components in order
    for (const node of executionOrder) {
      const componentName = node.data.label || 'Component';
      const componentCode = node.data.code || '';
      
      onProgress?.(`Executing ${componentName}...`);
      
      // Get parent hashes
      const incomingEdges = edges.filter(e => e.target === node.id);
      const parentHashes: string[] = [];
      const inputs: Record<string, any> = {};
      
      for (const edge of incomingEdges) {
        const parentResult = componentResults.get(edge.source);
        if (parentResult) {
          parentHashes.push(parentResult.hash);
          // Merge parent outputs as inputs
          Object.assign(inputs, parentResult.outputs);
        }
      }
      
      // Don't create separate pending vertices - they cause spurious nodes
      // Instead, we'll show the running state in the progress callback
      
      // Execute component
      const result = await executeComponent(componentName, componentCode, inputs, parentHashes);
      componentResults.set(node.id, result);
      
      // Update vertex with results
      const completedVertex: GraphVertex = {
        id: result.hash,
        label: componentName,
        properties: {
          hash: result.hash,
          name: componentName,
          timestamp: new Date().toISOString(),
          inputs,
          outputs: result.outputs,
          parent_hash: parentHashes,
          status: 'completed'
        }
      };
      vertices.push(completedVertex);
      
      // Add edges from parents
      for (const parentHash of parentHashes) {
        graphEdges.push({
          id: `${parentHash}_to_${result.hash}`,
          source: parentHash,
          target: result.hash,
          label: 'parent_of'
        });
      }
      
      // Send progress update with graph data
      onProgress?.(`Completed ${componentName}`, { vertices, edges: graphEdges });
    }
    
    // Get final result
    const lastNode = executionOrder[executionOrder.length - 1];
    const finalResult = lastNode ? componentResults.get(lastNode.id) : null;
    
    // Filter out any duplicate vertices (keep only completed ones)
    const uniqueVertices = vertices.filter(v => v.properties.status === 'completed');
    
    const finalGraphData = { vertices: uniqueVertices, edges: graphEdges };
    
    // Store in graph service for the visualization tab
    console.log('ExecutionService: Storing graph data with', uniqueVertices.length, 'vertices and', graphEdges.length, 'edges');
    graphService.setExecutionData({
      nodes: uniqueVertices.map(v => ({
        id: v.id,
        label: v.label,
        group: v.properties.status,
        properties: v.properties,
        _label: v.label,
        _type: 'component'
      })),
      edges: graphEdges.map(e => ({
        id: e.id,
        from: e.source,
        to: e.target,
        label: e.label,
        _label: e.label
      }))
    });
    
    onProgress?.('Pipeline execution completed!', finalGraphData);
    
    return {
      success: true,
      outputs: finalResult?.outputs || {},
      graphData: finalGraphData
    };
    
  } catch (error) {
    console.error('Pipeline execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Mock WebSocket connection for real-time graph updates
export const connectToGraphDB = (
  onUpdate: (data: GraphExecutionData) => void
): (() => void) => {
  // In a real implementation, this would connect to ws://localhost:8182
  // For now, we'll use the execution service updates
  
  const cleanup = () => {
    // Cleanup WebSocket connection
  };
  
  return cleanup;
};