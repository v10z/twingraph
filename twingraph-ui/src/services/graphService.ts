import axios from 'axios';

interface GraphNode {
  id: string;
  label: string;
  group?: string;
  properties?: Record<string, any>;
  _label?: string;
  _type?: string;
}

interface GraphEdge {
  id?: string;
  from: string;
  to: string;
  label?: string;
  properties?: Record<string, any>;
  _label?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

class GraphService {
  private apiUrl = '/api';
  private lastExecutionData: GraphData | null = null;

  async getExecutionGraph(executionId: string): Promise<GraphData> {
    try {
      const response = await axios.get(`${this.apiUrl}/graph/execution/${executionId}`);
      return this.transformGraphData(response.data);
    } catch (error) {
      console.error('Failed to fetch execution graph:', error);
      return { nodes: [], edges: [] };
    }
  }

  async getComponentGraph(componentHash: string): Promise<GraphData> {
    try {
      const response = await axios.get(`${this.apiUrl}/graph/component/${componentHash}`);
      return this.transformGraphData(response.data);
    } catch (error) {
      console.error('Failed to fetch component graph:', error);
      return { nodes: [], edges: [] };
    }
  }

  async getFullGraph(limit: number = 100): Promise<GraphData> {
    try {
      const response = await axios.get(`${this.apiUrl}/graph/full?limit=${limit}`);
      return this.transformGraphData(response.data);
    } catch (error) {
      console.error('Failed to fetch full graph:', error);
      // Return last execution data if available
      if (this.lastExecutionData) {
        console.log('GraphService: Returning stored execution data:', this.lastExecutionData);
        return this.lastExecutionData;
      }
      console.log('GraphService: No execution data available');
      return { nodes: [], edges: [] };
    }
  }
  
  // Store execution data for the graph visualization
  setExecutionData(data: GraphData): void {
    console.log('GraphService: Storing execution data:', data);
    this.lastExecutionData = data;
  }

  async getGraphStatistics(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/graph/statistics`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch graph statistics:', error);
      return {};
    }
  }

  private transformGraphData(data: any): GraphData {
    // Transform the backend graph data to the format expected by vis-network
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // Process nodes
    if (data.nodes) {
      Object.entries(data.nodes).forEach(([nodeId, nodeData]: [string, any]) => {
        const node: GraphNode = {
          id: nodeId,
          label: nodeData.Name || nodeData.label || nodeId,
          group: nodeData.Platform || nodeData.Type || 'default',
          properties: nodeData
        };
        nodes.push(node);
        nodeMap.set(nodeId, node);
      });
    }

    // Process edges
    if (data.edges) {
      data.edges.forEach((edge: any) => {
        edges.push({
          from: edge.from,
          to: edge.to,
          label: edge.label || edge.type || ''
        });
      });
    }

    return { nodes, edges };
  }

  async searchComponents(query: {
    name?: string;
    platform?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): Promise<GraphNode[]> {
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });

      const response = await axios.get(`${this.apiUrl}/graph/search?${params}`);
      return response.data.map((node: any) => ({
        id: node.Hash || node.id,
        label: node.Name || node.label,
        group: node.Platform || 'default',
        properties: node
      }));
    } catch (error) {
      console.error('Failed to search components:', error);
      return [];
    }
  }

  async executeGremlinQuery(query: string): Promise<GraphData> {
    try {
      const response = await axios.post(`${this.apiUrl}/graph/gremlin`, { query });
      return this.transformGremlinResults(response.data);
    } catch (error) {
      console.error('Failed to execute Gremlin query:', error);
      throw error;
    }
  }

  private transformGremlinResults(data: any): GraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // Handle different Gremlin result formats
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.type === 'vertex' || item.label) {
          const node: GraphNode = {
            id: item.id || item.T.id,
            label: item.label || item.properties?.Name?.[0]?.value || item.id,
            _label: item.label,
            _type: item.properties?.Type?.[0]?.value,
            properties: this.extractProperties(item.properties)
          };
          if (!nodeMap.has(node.id)) {
            nodes.push(node);
            nodeMap.set(node.id, node);
          }
        } else if (item.type === 'edge' || item.inV) {
          edges.push({
            id: item.id || `${item.outV}-${item.inV}`,
            from: item.outV,
            to: item.inV,
            label: item.label || 'connects',
            _label: item.label,
            properties: this.extractProperties(item.properties)
          });
        }
      });
    } else if (data.vertices && data.edges) {
      // Handle structured response
      data.vertices.forEach((vertex: any) => {
        const node: GraphNode = {
          id: vertex.id,
          label: vertex.properties?.Name || vertex.label || vertex.id,
          _label: vertex.label,
          _type: vertex.properties?.Type,
          properties: vertex.properties
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
      });

      data.edges.forEach((edge: any) => {
        edges.push({
          id: edge.id,
          from: edge.from || edge.outV,
          to: edge.to || edge.inV,
          label: edge.label,
          _label: edge.label,
          properties: edge.properties
        });
      });
    }

    return { nodes, edges };
  }

  private extractProperties(props: any): Record<string, any> {
    if (!props) return {};
    
    const result: Record<string, any> = {};
    
    // Handle Gremlin property format
    if (typeof props === 'object') {
      Object.entries(props).forEach(([key, value]: [string, any]) => {
        if (Array.isArray(value) && value.length > 0 && value[0].value !== undefined) {
          result[key] = value[0].value;
        } else {
          result[key] = value;
        }
      });
    }
    
    return result;
  }
}

export const graphService = new GraphService();