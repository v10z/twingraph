import { Node, Edge } from 'reactflow';
import { CodeTemplate } from '../components/WorkflowEditor/CodeTemplates';

interface ComponentNode extends Node {
  data: {
    label: string;
    computeEnvironment?: string;
    code?: string;
    language?: string;
    decoratorInputs?: Record<string, any>;
    subComponents?: any[];
  };
}

export const generatePipelineCode = (nodes: ComponentNode[], edges: Edge[], pipelineName: string = 'pipeline'): string => {
  if (nodes.length === 0) {
    return `# Empty pipeline
from twingraph import pipeline

@pipeline(name="${pipelineName}")
def ${pipelineName}():
    """An empty pipeline ready for components."""
    pass
`;
  }

  // Sort nodes based on edge connections (topological sort)
  const sortedNodes = topologicalSort(nodes, edges);
  
  // Generate imports
  const imports = generateImports(sortedNodes);
  
  // Generate component functions
  const componentFunctions = sortedNodes.map(node => generateComponentFunction(node)).join('\n\n');
  
  // Generate pipeline function
  const pipelineFunction = generatePipelineFunction(sortedNodes, edges, pipelineName);
  
  return `${imports}

${componentFunctions}

${pipelineFunction}`;
};

export const generateComponentCode = (node: ComponentNode): string => {
  const { data } = node;
  
  // If node already has code, return it
  if (data.code) {
    return data.code;
  }
  
  // Generate default code based on component type
  const functionName = data.label.toLowerCase().replace(/\s+/g, '_');
  const computeEnv = data.computeEnvironment || 'local';
  
  return `from twingraph import component
from collections import namedtuple

@component(
    compute_environment="${computeEnv}"${generateDecoratorParams(data.decoratorInputs)}
)
def ${functionName}(input_data):
    """${data.label} component."""
    # TODO: Implement ${data.label} logic
    
    # Process input data
    result = input_data
    
    # Return outputs as namedtuple (required by TwinGraph)
    outputs = namedtuple('outputs', ['result'])
    return outputs(result)`;
};

const generateImports = (nodes: ComponentNode[]): string => {
  const imports = new Set(['from twingraph import pipeline, component', 'from collections import namedtuple']);
  
  // Add environment-specific imports
  nodes.forEach(node => {
    const env = node.data.computeEnvironment;
    if (env === 'docker') {
      imports.add('from twingraph.docker import DockerConfig');
    } else if (env === 'kubernetes') {
      imports.add('from twingraph.kubernetes import K8sConfig');
    } else if (env === 'lambda') {
      imports.add('from twingraph.awsmodules.awslambda import LambdaConfig');
    } else if (env === 'batch') {
      imports.add('from twingraph.awsmodules.batch import BatchConfig');
    } else if (env === 'celery') {
      imports.add('from twingraph.orchestration import CeleryConfig');
    }
  });
  
  return Array.from(imports).join('\n');
};

const generateComponentFunction = (node: ComponentNode): string => {
  if (node.data.code) {
    // If component has custom code, use it
    return node.data.code;
  }
  
  // Check if it has subComponents (nested workflow)
  if (node.data.subComponents && node.data.subComponents.length > 0) {
    return generateNestedComponentFunction(node);
  }
  
  return generateComponentCode(node);
};

const generateNestedComponentFunction = (node: ComponentNode): string => {
  const functionName = node.data.label.toLowerCase().replace(/\s+/g, '_');
  const computeEnv = node.data.computeEnvironment || 'local';
  const subComponents = node.data.subComponents || [];
  
  const subComponentCalls = subComponents.map((sub: any, index: number) => {
    const subName = sub.name.toLowerCase().replace(/\s+/g, '_');
    if (index === 0) {
      return `    result = ${subName}(input_data)`;
    }
    return `    result = ${subName}(result)`;
  }).join('\n');
  
  return `@component(
    compute_environment="${computeEnv}"${generateDecoratorParams(node.data.decoratorInputs)}
)
def ${functionName}(input_data):
    """${node.data.label} component with nested workflow."""
${subComponentCalls}
    return result`;
};

const generateDecoratorParams = (decoratorInputs?: Record<string, any>): string => {
  if (!decoratorInputs || Object.keys(decoratorInputs).length === 0) {
    return '';
  }
  
  const params = Object.entries(decoratorInputs)
    .filter(([_, value]) => value !== undefined && value !== '')
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `\n    ${key}="${value}"`;
      } else if (typeof value === 'object') {
        return `\n    ${key}=${JSON.stringify(value)}`;
      }
      return `\n    ${key}=${value}`;
    })
    .join(',');
  
  return params;
};

const generatePipelineFunction = (nodes: ComponentNode[], edges: Edge[], pipelineName: string): string => {
  // Create adjacency list
  const adjacencyList = createAdjacencyList(edges);
  
  // Find start nodes (component nodes with no incoming edges from other components)
  const componentNodes = nodes.filter(n => n.type === 'component');
  const startNodes = componentNodes.filter(node => 
    !edges.some(edge => edge.target === node.id && 
      nodes.find(n => n.id === edge.source)?.type === 'component')
  );
  
  // Generate pipeline parameters
  const pipelineParams = generatePipelineParams(nodes);
  
  // Generate execution flow
  const executionFlow = generateExecutionFlow(nodes, adjacencyList, startNodes);
  
  return `@pipeline(
    name="${pipelineName}"${pipelineParams}
)
def ${pipelineName}():
    """Generated pipeline from visual workflow."""
${executionFlow}
    return final_result`;
};

const generatePipelineParams = (nodes: ComponentNode[]): string => {
  const params: Record<string, any> = {};
  
  // Check if any node uses celery
  if (nodes.some(n => n.data.computeEnvironment === 'celery')) {
    params.celery_pipeline = true;
  }
  
  // Check if any node uses batch
  if (nodes.some(n => n.data.computeEnvironment === 'batch')) {
    params.batch_pipeline = true;
  }
  
  // Add graph tracing
  params.graph_tracing = true;
  
  return Object.entries(params)
    .map(([key, value]) => `\n    ${key}=${value}`)
    .join(',');
};

const generateExecutionFlow = (
  nodes: ComponentNode[], 
  adjacencyList: Map<string, string[]>,
  startNodes: ComponentNode[]
): string => {
  const flow: string[] = [];
  const processed = new Set<string>();
  const nodeResults = new Map<string, string>(); // Track result variable names
  
  // Initialize with empty parent hash for start nodes
  flow.push(`    # Initialize execution`);
  
  // Process each branch
  startNodes.forEach((startNode, index) => {
    const branchFlow = processBranch(startNode, nodes, adjacencyList, processed, nodeResults, []);
    if (index > 0) {
      flow.push(`\n    # Branch ${index + 1}`);
    }
    flow.push(...branchFlow);
  });
  
  // Determine final result
  const lastProcessedNode = Array.from(processed).pop();
  if (lastProcessedNode && nodeResults.has(lastProcessedNode)) {
    const varName = nodeResults.get(lastProcessedNode);
    flow.push(`\n    final_result = ${varName}`);
  } else {
    flow.push(`\n    final_result = {}`);
  }
  
  return flow.join('\n');
};

const processBranch = (
  node: ComponentNode,
  allNodes: ComponentNode[],
  adjacencyList: Map<string, string[]>,
  processed: Set<string>,
  nodeResults: Map<string, string>,
  parentNodes: ComponentNode[] = []
): string[] => {
  if (processed.has(node.id)) {
    return [];
  }
  
  // Skip start nodes - they're just visual entry points
  if (node.type === 'start') {
    processed.add(node.id);
    const children = adjacencyList.get(node.id) || [];
    const childFlows: string[] = [];
    children.forEach(childId => {
      const childNode = allNodes.find(n => n.id === childId);
      if (childNode) {
        // Start node's children have no parent hash
        const childFlow = processBranch(childNode, allNodes, adjacencyList, processed, nodeResults, []);
        childFlows.push(...childFlow);
      }
    });
    return childFlows;
  }
  
  const flow: string[] = [];
  processed.add(node.id);
  
  const functionName = node.data.label.toLowerCase().replace(/\s+/g, '_');
  const resultVar = `${functionName}_result`;
  
  // Build parent hash parameter
  if (parentNodes.length > 0 && parentNodes[0].type !== 'start') {
    const parentHashes = parentNodes.map(p => {
      const parentVar = nodeResults.get(p.id);
      return parentVar ? `${parentVar}['hash']` : '"1"';
    });
    flow.push(`    ${resultVar} = ${functionName}(parent_hash=[${parentHashes.join(', ')}])`);
  } else {
    // No parents or parent is start node
    flow.push(`    ${resultVar} = ${functionName}(parent_hash=[])`);
  }
  
  nodeResults.set(node.id, resultVar);
  
  // Process children
  const children = adjacencyList.get(node.id) || [];
  children.forEach(childId => {
    const childNode = allNodes.find(n => n.id === childId);
    if (childNode) {
      const childFlow = processBranch(childNode, allNodes, adjacencyList, processed, nodeResults, [node]);
      flow.push(...childFlow);
    }
  });
  
  return flow;
};

const createAdjacencyList = (edges: Edge[]): Map<string, string[]> => {
  const adjacencyList = new Map<string, string[]>();
  
  edges.forEach(edge => {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source)!.push(edge.target);
  });
  
  return adjacencyList;
};

const topologicalSort = (nodes: ComponentNode[], edges: Edge[]): ComponentNode[] => {
  // Filter only component nodes (exclude start, conditional, loop nodes)
  const componentNodes = nodes.filter(n => n.type === 'component');
  
  const adjacencyList = createAdjacencyList(edges);
  const inDegree = new Map<string, number>();
  
  // Initialize in-degree for component nodes only
  componentNodes.forEach(node => inDegree.set(node.id, 0));
  edges.forEach(edge => {
    if (inDegree.has(edge.target)) {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  });
  
  // Find component nodes with no incoming edges from other components
  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });
  
  const sorted: ComponentNode[] = [];
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = componentNodes.find(n => n.id === nodeId);
    if (node) sorted.push(node);
    
    // Reduce in-degree of neighbors
    const neighbors = adjacencyList.get(nodeId) || [];
    neighbors.forEach(neighborId => {
      if (inDegree.has(neighborId)) {
        const newDegree = (inDegree.get(neighborId) || 0) - 1;
        inDegree.set(neighborId, newDegree);
        if (newDegree === 0) queue.push(neighborId);
      }
    });
  }
  
  return sorted;
};