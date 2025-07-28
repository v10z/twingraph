import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Network, Options } from 'vis-network/peer';
import { DataSet } from 'vis-data/peer';
import { useWorkflowStore } from '../../stores/workflowStore';
import { graphService } from '../../services/graphService';
import { theme } from '../../styles/theme';
import { 
  VisualizationIcon, 
  SaveIcon, 
  CloseIcon,
  GraphIcon
} from '../Icons/Icons';

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

interface GraphVisualizationProps {
  embedded?: boolean;
  onClose?: () => void;
}

interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  components: number;
  avgDegree: number;
}

export const ModernGraphVisualization: React.FC<GraphVisualizationProps> = ({ embedded = false, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[], edges: GraphEdge[] }>({
    nodes: [],
    edges: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<GraphStats>({
    nodeCount: 0,
    edgeCount: 0,
    components: 0,
    avgDegree: 0
  });
  
  const { currentWorkflow, executions } = useWorkflowStore();
  const currentExecution = executions[0];

  // Fetch graph data
  const fetchGraphData = async () => {
    try {
      if (currentExecution?.executionId) {
        const data = await graphService.getExecutionGraph(currentExecution.executionId);
        setGraphData(data);
        updateStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    }
  };

  // Update statistics
  const updateStats = (data: { nodes: GraphNode[], edges: GraphEdge[] }) => {
    const nodeCount = data.nodes.length;
    const edgeCount = data.edges.length;
    const avgDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;
    
    // Calculate connected components
    const components = calculateComponents(data);
    
    setStats({
      nodeCount,
      edgeCount,
      components,
      avgDegree: Math.round(avgDegree * 100) / 100
    });
  };

  // Calculate connected components
  const calculateComponents = (data: { nodes: GraphNode[], edges: GraphEdge[] }): number => {
    const adjacencyList: Record<string, string[]> = {};
    data.nodes.forEach(node => adjacencyList[node.id] = []);
    data.edges.forEach(edge => {
      adjacencyList[edge.from]?.push(edge.to);
      adjacencyList[edge.to]?.push(edge.from);
    });
    
    const visited = new Set<string>();
    let components = 0;
    
    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      adjacencyList[nodeId]?.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      });
    };
    
    data.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        components++;
        dfs(node.id);
      }
    });
    
    return components;
  };

  // Get node color based on platform
  const getNodeColor = useCallback((node: GraphNode): { background: string; border: string } => {
    if (node.properties?.Platform) {
      const platformColors: Record<string, { background: string; border: string }> = {
        'Local': { background: theme.colors.components.node.success, border: theme.colors.ui.accent },
        'Docker': { background: theme.colors.components.node.default, border: theme.colors.ui.accent },
        'Kubernetes': { background: theme.colors.components.node.running, border: theme.colors.ui.accent },
        'Lambda': { background: theme.colors.text.accent, border: theme.colors.ui.highlight },
        'Batch': { background: theme.colors.components.node.warning, border: theme.colors.ui.accent }
      };
      return platformColors[node.properties.Platform] || { 
        background: theme.colors.components.node.default, 
        border: theme.colors.ui.border 
      };
    }
    
    // Status-based colors
    if (currentExecution?.nodes[node.id]) {
      const status = currentExecution.nodes[node.id].status;
      const statusColors: Record<string, { background: string; border: string }> = {
        'completed': { background: theme.colors.components.node.success, border: theme.colors.ui.accent },
        'running': { background: theme.colors.components.node.running, border: theme.colors.ui.accent },
        'failed': { background: theme.colors.components.node.error, border: theme.colors.text.error },
        'pending': { background: theme.colors.bg.tertiary, border: theme.colors.ui.border }
      };
      return statusColors[status] || { 
        background: theme.colors.components.node.default, 
        border: theme.colors.ui.border 
      };
    }
    
    return { 
      background: theme.colors.components.node.default, 
      border: theme.colors.ui.border 
    };
  }, [currentExecution]);

  // Setup network visualization
  useEffect(() => {
    if (!containerRef.current || graphData.nodes.length === 0) return;

    const nodes = new DataSet<any>(
      graphData.nodes.map(node => {
        const colors = getNodeColor(node);
        return {
          id: node.id,
          label: node.label || node.id,
          title: createNodeTooltip(node),
          color: {
            background: colors.background,
            border: colors.border,
            highlight: {
              background: theme.colors.components.node.hover,
              border: theme.colors.ui.highlight
            }
          },
          font: { 
            color: theme.colors.text.primary,
            size: 12,
            face: theme.typography.fontFamily.sans
          },
          borderWidth: 2,
          borderWidthSelected: 3,
          shape: getNodeShape(node),
          ...node.properties
        };
      })
    );

    const edges = new DataSet<any>(
      graphData.edges.map(edge => ({
        id: edge.id || `${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8,
            type: 'arrow'
          }
        },
        color: { 
          color: theme.colors.components.edge.default,
          highlight: theme.colors.components.edge.selected,
          hover: theme.colors.components.edge.hover
        },
        width: 2,
        smooth: {
          type: 'cubicBezier',
          roundness: 0.2
        },
        font: {
          color: theme.colors.text.secondary,
          size: 10,
          background: theme.colors.bg.primary,
          strokeWidth: 3,
          strokeColor: theme.colors.bg.primary
        }
      }))
    );

    const options: Options = {
      nodes: {
        borderWidth: 2,
        shadow: {
          enabled: true,
          color: theme.colors.ui.shadow,
          size: 10,
          x: 5,
          y: 5
        }
      },
      edges: {
        width: 2,
        smooth: {
          enabled: true,
          type: 'dynamic'
        }
      },
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'LR',
          sortMethod: 'directed',
          levelSeparation: 200,
          nodeSpacing: 150,
          treeSpacing: 200,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true
        }
      },
      physics: {
        enabled: false
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        hideEdgesOnDrag: true,
        keyboard: {
          enabled: true,
          bindToWindow: false
        }
      }
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    // Event handlers
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (node) {
          setSelectedNode(node);
        }
      } else {
        setSelectedNode(null);
      }
    });

    // Update execution status
    if (currentExecution) {
      const updateColors = () => {
        Object.entries(currentExecution.nodes).forEach(([nodeId, status]) => {
          const colors = getNodeColor({ id: nodeId, label: '', properties: {} });
          nodes.update({ 
            id: nodeId, 
            color: {
              background: colors.background,
              border: colors.border,
              highlight: {
                background: theme.colors.components.node.hover,
                border: theme.colors.ui.highlight
              }
            }
          });
        });
      };

      const interval = setInterval(updateColors, 500);
      
      return () => {
        clearInterval(interval);
        network.destroy();
      };
    }

    return () => {
      network.destroy();
    };
  }, [graphData, currentExecution, getNodeColor]);

  // Helper functions
  const getNodeShape = (node: GraphNode): string => {
    if (node.properties?.Type === 'PipelineStart') return 'circle';
    if (node.properties?.Type === 'PipelineEnd') return 'square';
    if (node._type === 'data') return 'database';
    if (node._type === 'model') return 'diamond';
    return 'box';
  };

  const createNodeTooltip = (node: GraphNode): string => {
    const props = node.properties || {};
    return `
      <div style="padding: 8px; background: ${theme.colors.bg.secondary}; border: 1px solid ${theme.colors.ui.border}; border-radius: 4px;">
        <strong style="color: ${theme.colors.text.primary}">${node.label || node.id}</strong><br/>
        <hr style="margin: 4px 0; border-color: ${theme.colors.ui.border};"/>
        ${Object.entries(props).slice(0, 5).map(([key, value]) => 
          `<div style="color: ${theme.colors.text.secondary};"><strong>${key}:</strong> ${JSON.stringify(value).substring(0, 50)}</div>`
        ).join('')}
        ${Object.keys(props).length > 5 ? `<div style="color: ${theme.colors.text.muted};">...</div>` : ''}
      </div>
    `;
  };

  // Export functions
  const exportGraph = (format: 'png' | 'json') => {
    if (!networkRef.current) return;
    
    switch (format) {
      case 'png':
        const canvas = networkRef.current.canvas.frame.canvas;
        const link = document.createElement('a');
        link.download = 'twingraph-visualization.png';
        link.href = canvas.toDataURL();
        link.click();
        break;
      
      case 'json':
        const data = JSON.stringify(graphData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = 'twingraph-data.json';
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
        break;
    }
  };

  // Auto-refresh
  useEffect(() => {
    if (currentExecution?.status === 'running') {
      const interval = setInterval(fetchGraphData, 1000);
      return () => clearInterval(interval);
    } else {
      fetchGraphData();
    }
  }, [currentExecution]);

  // Filter nodes based on search
  const filteredNodes = searchQuery
    ? graphData.nodes.filter(node => 
        node.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.label?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : graphData.nodes;

  return (
    <div className={embedded ? 'h-full flex flex-col' : 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'}>
      <div className={embedded ? 'flex-1 flex flex-col bg-[#002451]' : 'bg-[#001733] rounded-lg shadow-2xl m-4 flex flex-col w-full max-w-7xl h-[90vh] border border-[#7aa6da20]'}>
        {/* Header */}
        <div className="bg-[#002451] border-b border-[#7aa6da20] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GraphIcon className="w-5 h-5 text-[#7aa6da]" />
            <h3 className="text-sm font-medium text-[#bbdaff]">Graph Visualization</h3>
            <input
              type="text"
              placeholder="Search nodes..."
              className="px-3 py-1 text-xs bg-[#003666] text-white placeholder-[#7aa6da] border border-[#7aa6da20] rounded-md focus:outline-none focus:border-[#6699cc] transition-colors w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-[#7aa6da] mr-4">
              <span>Nodes: {stats.nodeCount}</span>
              <span>Edges: {stats.edgeCount}</span>
              <span>Components: {stats.components}</span>
              <span>Avg Degree: {stats.avgDegree}</span>
            </div>

            <button
              onClick={() => networkRef.current?.fit()}
              className="px-3 py-1.5 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors flex items-center gap-1.5"
              title="Fit to view"
            >
              <VisualizationIcon className="w-4 h-4" />
              <span>Fit</span>
            </button>
            
            <button
              onClick={() => exportGraph('png')}
              className="px-3 py-1.5 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors flex items-center gap-1.5"
              title="Export as PNG"
            >
              <SaveIcon className="w-4 h-4" />
              <span>PNG</span>
            </button>
            
            <button
              onClick={() => exportGraph('json')}
              className="px-3 py-1.5 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors flex items-center gap-1.5"
              title="Export as JSON"
            >
              <SaveIcon className="w-4 h-4" />
              <span>JSON</span>
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs bg-[#f97b58] text-white rounded hover:bg-[#f85a34] transition-colors flex items-center gap-1.5"
              >
                <CloseIcon className="w-4 h-4" />
                <span>Close</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Graph Canvas */}
          <div className="flex-1 relative bg-[#002451]">
            <div ref={containerRef} className="w-full h-full" />
          </div>
          
          {/* Node Inspector */}
          {selectedNode && (
            <div className="w-80 bg-[#001733] border-l border-[#7aa6da20] p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-[#bbdaff]">Node Properties</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[#7aa6da] hover:text-white transition-colors"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-[#7aa6da] mb-1">ID</h4>
                  <p className="text-xs text-white font-mono bg-[#002451] p-2 rounded">{selectedNode.id}</p>
                </div>
                
                {selectedNode.label && (
                  <div>
                    <h4 className="text-xs font-medium text-[#7aa6da] mb-1">Label</h4>
                    <p className="text-xs text-white">{selectedNode.label}</p>
                  </div>
                )}
                
                {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-[#7aa6da] mb-2">Properties</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedNode.properties).map(([key, value]) => (
                        <div key={key} className="bg-[#002451] rounded p-2">
                          <span className="text-[#7aa6da] text-xs">{key}:</span>
                          <pre className="text-white text-xs mt-1 overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};