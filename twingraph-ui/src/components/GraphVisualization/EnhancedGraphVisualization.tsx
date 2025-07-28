import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Network, Options } from 'vis-network/peer';
import { DataSet } from 'vis-data/peer';
import { useWorkflowStore } from '../../stores/workflowStore';
import { graphService } from '../../services/graphService';
import { NodeInspector } from './NodeInspector';
import { GraphControls } from './GraphControls';
import { GraphQueryPanel } from './GraphQueryPanel';
import { GraphStats } from './GraphStats';
import { ColorLegend } from './ColorLegend';
import { GraphIcon, CloseIcon } from '../Icons/Icons';

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
  onClose?: () => void;
  embedded?: boolean;
}

interface VisualizationSettings {
  physics: boolean;
  hierarchical: boolean;
  clustering: boolean;
  nodeLabels: 'id' | 'label' | 'type' | 'custom';
  edgeLabels: boolean;
  colorScheme: 'platform' | 'status' | 'type' | 'community';
  layout: 'hierarchical' | 'force' | 'circular' | 'grid';
  nodeSize: 'uniform' | 'degree' | 'pagerank';
  showOrphans: boolean;
  animateTransitions: boolean;
}

export const EnhancedGraphVisualization: React.FC<GraphVisualizationProps> = ({ onClose, embedded = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[], edges: GraphEdge[] }>({
    nodes: [],
    edges: []
  });
  const [filteredData, setFilteredData] = useState<{ nodes: GraphNode[], edges: GraphEdge[] }>({
    nodes: [],
    edges: []
  });
  const [settings, setSettings] = useState<VisualizationSettings>({
    physics: false,
    hierarchical: true,
    clustering: false,
    nodeLabels: 'label',
    edgeLabels: true,
    colorScheme: 'platform',
    layout: 'hierarchical',
    nodeSize: 'uniform',
    showOrphans: true,
    animateTransitions: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [gremlinQuery, setGremlinQuery] = useState('');
  const [graphStats, setGraphStats] = useState({
    nodeCount: 0,
    edgeCount: 0,
    components: 0,
    avgDegree: 0,
    density: 0
  });
  const [fullscreen, setFullscreen] = useState(false);
  
  const { currentWorkflow, executions } = useWorkflowStore();
  const currentExecution = executions[0];

  // Fetch graph data from TinkerGraph
  const fetchGraphData = async () => {
    console.log('EnhancedGraphVisualization: Fetching graph data...');
    try {
      if (currentExecution?.executionId) {
        const data = await graphService.getExecutionGraph(currentExecution.executionId);
        console.log('EnhancedGraphVisualization: Got execution data:', data);
        setGraphData(data);
        updateGraphStats(data);
      } else {
        // Try to get any available graph data (including last execution)
        const data = await graphService.getFullGraph(100);
        console.log('EnhancedGraphVisualization: Got full graph data:', data);
        if (data.nodes.length > 0) {
          setGraphData(data);
          updateGraphStats(data);
        } else {
          console.log('EnhancedGraphVisualization: No nodes in data');
        }
      }
    } catch (error) {
      console.error('EnhancedGraphVisualization: Failed to fetch graph data:', error);
    }
  };

  // Execute Gremlin query
  const executeGremlinQuery = async () => {
    try {
      const result = await graphService.executeGremlinQuery(gremlinQuery);
      if (result.nodes && result.edges) {
        setFilteredData(result);
      }
    } catch (error) {
      console.error('Gremlin query failed:', error);
    }
  };

  // Update graph statistics
  const updateGraphStats = (data: { nodes: GraphNode[], edges: GraphEdge[] }) => {
    const nodeCount = data.nodes.length;
    const edgeCount = data.edges.length;
    const avgDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    
    // Calculate connected components (simplified)
    const components = calculateConnectedComponents(data);
    
    setGraphStats({
      nodeCount,
      edgeCount,
      components,
      avgDegree: Math.round(avgDegree * 100) / 100,
      density: Math.round(density * 100) / 100
    });
  };

  // Calculate connected components
  const calculateConnectedComponents = (data: { nodes: GraphNode[], edges: GraphEdge[] }): number => {
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

  // Filter nodes based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredData(graphData);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filteredNodes = graphData.nodes.filter(node => 
      node.id.toLowerCase().includes(query) ||
      node.label?.toLowerCase().includes(query) ||
      JSON.stringify(node.properties).toLowerCase().includes(query)
    );
    
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = graphData.edges.filter(edge =>
      filteredNodeIds.has(edge.from) || filteredNodeIds.has(edge.to)
    );
    
    // Include connected nodes
    filteredEdges.forEach(edge => {
      if (!filteredNodeIds.has(edge.from)) {
        const node = graphData.nodes.find(n => n.id === edge.from);
        if (node) filteredNodes.push(node);
      }
      if (!filteredNodeIds.has(edge.to)) {
        const node = graphData.nodes.find(n => n.id === edge.to);
        if (node) filteredNodes.push(node);
      }
    });
    
    setFilteredData({ nodes: filteredNodes, edges: filteredEdges });
  }, [searchQuery, graphData]);

  // Get node color configuration (returns both background and border colors)
  const getNodeColors = useCallback((node: GraphNode): { background: string; border: string } => {
    // First, get the base color based on the color scheme
    let baseColor = '#607D8B';
    
    switch (settings.colorScheme) {
      case 'platform':
        const platform = node.properties?.Platform || node.properties?.compute_environment || 'local';
        const platformColors: Record<string, string> = {
          'Local': '#99c794',
          'local': '#99c794',
          'Docker': '#6699cc',
          'docker': '#6699cc',
          'Kubernetes': '#82aaff',
          'kubernetes': '#82aaff',
          'Lambda': '#ffcc66',
          'lambda': '#ffcc66',
          'Batch': '#f97b58',
          'batch': '#f97b58',
          'Celery': '#c594c5',
          'celery': '#c594c5',
          'Slurm': '#ff6b6b',
          'slurm': '#ff6b6b',
          'SSH': '#4ecdc4',
          'ssh': '#4ecdc4'
        };
        baseColor = platformColors[platform] || '#5a7ca7';
        break;
      
      case 'status':
        if (node.properties?.status) {
          const statusColors: Record<string, string> = {
            'pending': '#5a7ca7',
            'running': '#ffcc66',
            'completed': '#99c794',
            'failed': '#f97b58'
          };
          baseColor = statusColors[node.properties.status] || '#607D8B';
        }
        break;
      
      case 'type':
        const typeColors: Record<string, string> = {
          'component': '#2196F3',
          'pipeline': '#4CAF50',
          'data': '#FF9800',
          'model': '#9C27B0',
          'service': '#F44336'
        };
        baseColor = typeColors[node._type || 'component'] || '#607D8B';
        break;
      
      case 'community':
        // Implement community detection coloring
        baseColor = '#' + Math.floor(Math.random()*16777215).toString(16);
        break;
    }
    
    // Now, if the node has a status, use it for the border to show execution state
    let borderColor = baseColor;
    if (node.properties?.status && settings.colorScheme !== 'status') {
      const statusBorderColors: Record<string, string> = {
        'pending': '#3a5a7a',
        'running': '#ff9900',
        'completed': '#5fb14f',
        'failed': '#e74c3c'
      };
      borderColor = statusBorderColors[node.properties.status] || borderColor;
    }
    
    return { background: baseColor, border: borderColor };
  }, [settings.colorScheme]);

  // Get node size based on settings
  const getNodeSize = useCallback((node: GraphNode): number => {
    switch (settings.nodeSize) {
      case 'uniform':
        return 30;
      
      case 'degree':
        const degree = filteredData.edges.filter(e => 
          e.from === node.id || e.to === node.id
        ).length;
        return Math.max(20, Math.min(60, 20 + degree * 5));
      
      case 'pagerank':
        // Simplified PageRank-like sizing
        return 30; // Would implement actual PageRank
      
      default:
        return 30;
    }
  }, [settings.nodeSize, filteredData]);

  // Get node label based on settings
  const getNodeLabel = useCallback((node: GraphNode): string => {
    switch (settings.nodeLabels) {
      case 'id':
        return node.id;
      case 'label':
        return node.label || node.id;
      case 'type':
        return node._type || 'node';
      case 'custom':
        return node.properties?.Name || node.label || node.id;
      default:
        return node.label || node.id;
    }
  }, [settings.nodeLabels]);

  // Get layout options
  const getLayoutOptions = useCallback((): any => {
    switch (settings.layout) {
      case 'hierarchical':
        return {
          hierarchical: {
            enabled: true,
            direction: 'LR',
            sortMethod: 'directed',
            levelSeparation: 200,
            nodeSpacing: 100,
            treeSpacing: 200,
            blockShifting: true,
            edgeMinimization: true
          }
        };
      
      case 'force':
        return {
          hierarchical: false,
          physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
              gravitationalConstant: -50,
              centralGravity: 0.01,
              springLength: 100,
              springConstant: 0.08
            }
          }
        };
      
      case 'circular':
        return {
          hierarchical: false,
          layout: {
            improvedLayout: true
          }
        };
      
      case 'grid':
        return {
          hierarchical: false,
          physics: {
            enabled: false
          }
        };
      
      default:
        return {};
    }
  }, [settings.layout]);

  // Setup network visualization
  useEffect(() => {
    console.log('EnhancedGraphVisualization: Setting up network, filteredData:', filteredData);
    console.log('EnhancedGraphVisualization: Container ref:', containerRef.current);
    if (!containerRef.current || filteredData.nodes.length === 0) {
      console.log('EnhancedGraphVisualization: No container or no nodes, skipping network setup');
      return;
    }

    const nodes = new DataSet<any>(
      filteredData.nodes.map(node => {
        const colors = getNodeColors(node);
        return {
          id: node.id,
          label: getNodeLabel(node),
          title: createNodeTooltip(node),
          color: {
            background: colors.background,
            border: colors.border,
            highlight: {
              background: colors.background,
              border: colors.border
            }
          },
          borderWidth: node.properties?.status === 'running' ? 4 : (selectedNode?.id === node.id ? 4 : 2),
          borderWidthSelected: 4,
          size: getNodeSize(node),
          shape: getNodeShape(node),
          font: { 
            color: '#ffffff',
            size: 12,
            face: 'Arial'
          },
          ...node.properties
        };
      })
    );

    const edges = new DataSet<any>(
      filteredData.edges.map(edge => ({
        id: edge.id || `${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        label: settings.edgeLabels ? (edge.label || edge._label) : undefined,
        title: createEdgeTooltip(edge),
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8
          }
        },
        color: { 
          color: selectedEdge?.id === edge.id ? '#FF5722' : '#848484',
          highlight: '#FF5722',
          hover: '#FF5722'
        },
        width: selectedEdge?.id === edge.id ? 3 : 1,
        smooth: {
          type: 'cubicBezier',
          forceDirection: settings.layout === 'hierarchical' ? 'horizontal' : 'none',
          roundness: 0.4
        }
      }))
    );

    const options: Options = {
      nodes: {
        borderWidth: 2,
        shadow: true,
        font: {
          size: 14,
          face: 'Arial',
          color: '#bbdaff'
        }
      },
      edges: {
        width: 2,
        font: {
          size: 12,
          align: 'middle',
          background: '#002451',
          color: '#7aa6da'
        },
        smooth: {
          enabled: true
        },
        color: {
          color: '#7aa6da',
          highlight: '#6699cc',
          hover: '#82aaff'
        }
      },
      physics: {
        enabled: settings.physics,
        stabilization: {
          enabled: true,
          iterations: 1000,
          updateInterval: 50
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        hideEdgesOnDrag: true,
        hideEdgesOnZoom: true,
        keyboard: {
          enabled: true,
          bindToWindow: false
        }
      },
      ...getLayoutOptions()
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    // Event handlers
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = filteredData.nodes.find(n => n.id === nodeId);
        if (node) {
          setSelectedNode(node);
          setSelectedEdge(null);
        }
      } else if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        const edge = filteredData.edges.find(e => (e.id || `${e.from}-${e.to}`) === edgeId);
        if (edge) {
          setSelectedEdge(edge);
          setSelectedNode(null);
        }
      } else {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    });

    network.on('hoverNode', (params) => {
      setHoveredNode(params.node);
    });

    network.on('blurNode', () => {
      setHoveredNode(null);
    });

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            document.getElementById('graph-search')?.focus();
          }
          break;
        case 'Escape':
          setSelectedNode(null);
          setSelectedEdge(null);
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            network.fit();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    // Update node colors based on execution status
    if (currentExecution) {
      const updateInterval = setInterval(() => {
        Object.entries(currentExecution.nodes).forEach(([nodeId, status]) => {
          const color = getStatusColor(status.status);
          nodes.update({ id: nodeId, color });
        });
      }, 500);
      
      return () => {
        clearInterval(updateInterval);
        network.destroy();
        window.removeEventListener('keydown', handleKeyPress);
      };
    }

    return () => {
      network.destroy();
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [filteredData, settings, currentExecution, getNodeColors, getNodeSize, getNodeLabel, getLayoutOptions]);

  // Helper functions
  const getNodeShape = (node: GraphNode): string => {
    if (node.properties?.Type === 'PipelineStart') return 'dot';
    if (node.properties?.Type === 'PipelineEnd') return 'square';
    if (node._type === 'data') return 'database';
    if (node._type === 'model') return 'diamond';
    return 'box';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#99c794';
      case 'running': return '#6699cc';
      case 'failed': return '#f97b58';
      case 'pending': return '#5a7ca7';
      default: return '#7aa6da';
    }
  };

  const createNodeTooltip = (node: GraphNode): string => {
    const props = node.properties || {};
    return `
      <div style="padding: 8px; max-width: 300px;">
        <strong>${node.label || node.id}</strong><br/>
        <hr style="margin: 4px 0;"/>
        ${Object.entries(props).slice(0, 5).map(([key, value]) => 
          `<div><strong>${key}:</strong> ${JSON.stringify(value).substring(0, 50)}</div>`
        ).join('')}
        ${Object.keys(props).length > 5 ? '<div>...</div>' : ''}
      </div>
    `;
  };

  const createEdgeTooltip = (edge: GraphEdge): string => {
    return `
      <div style="padding: 8px;">
        <strong>${edge.label || 'Edge'}</strong><br/>
        From: ${edge.from}<br/>
        To: ${edge.to}
        ${edge.properties ? '<br/>Properties: ' + Object.keys(edge.properties).length : ''}
      </div>
    `;
  };

  // Export functions
  const exportGraph = (format: 'png' | 'json' | 'gremlin') => {
    if (!networkRef.current) return;
    
    switch (format) {
      case 'png':
        const container = networkRef.current.body.container;
        const canvas = container.getElementsByTagName('canvas')[0];
        const link = document.createElement('a');
        link.download = 'twingraph-visualization.png';
        link.href = canvas.toDataURL();
        link.click();
        break;
      
      case 'json':
        const data = JSON.stringify(filteredData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = 'twingraph-data.json';
        a.href = url;
        a.click();
        break;
      
      case 'gremlin':
        // Export as Gremlin script
        const gremlinScript = generateGremlinScript(filteredData);
        const blob2 = new Blob([gremlinScript], { type: 'text/plain' });
        const url2 = URL.createObjectURL(blob2);
        const a2 = document.createElement('a');
        a2.download = 'twingraph-import.groovy';
        a2.href = url2;
        a2.click();
        break;
    }
  };

  const generateGremlinScript = (data: { nodes: GraphNode[], edges: GraphEdge[] }): string => {
    let script = '// Gremlin Import Script\n\n';
    
    // Add vertices
    data.nodes.forEach(node => {
      script += `g.addV('${node._label || 'node'}').property('id', '${node.id}')`;
      if (node.label) script += `.property('label', '${node.label}')`;
      Object.entries(node.properties || {}).forEach(([key, value]) => {
        script += `.property('${key}', '${JSON.stringify(value)}')`;
      });
      script += '\n';
    });
    
    script += '\n// Add edges\n';
    
    // Add edges
    data.edges.forEach(edge => {
      script += `g.V('${edge.from}').addE('${edge._label || 'connects'}').to(V('${edge.to}'))`;
      if (edge.label) script += `.property('label', '${edge.label}')`;
      script += '\n';
    });
    
    return script;
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
  
  // Refresh when component becomes visible (e.g., after execution)
  useEffect(() => {
    fetchGraphData();
  }, []);

  return (
    <div className={embedded ? 'h-full flex' : `${fullscreen ? 'fixed inset-0' : 'fixed inset-0'} bg-black bg-opacity-75 flex z-50`}>
      <div className={embedded ? 'flex-1 flex flex-col bg-[#002451]' : `bg-[#001733] rounded-lg shadow-xl ${fullscreen ? 'm-0' : 'm-4'} flex flex-1 overflow-hidden border border-[#7aa6da20]`}>
        {/* Top Bar */}
        <div className={embedded ? "px-4 py-2 border-b border-[#7aa6da20] flex items-center justify-between bg-[#002451]" : "bg-[#002451] border-b border-[#7aa6da20] px-4 py-3 flex items-center justify-between"}>
          <div className="flex items-center gap-4">
            <GraphIcon className="w-5 h-5 text-[#7aa6da]" />
            <h3 className="text-sm font-medium text-[#bbdaff]">Advanced Visualization</h3>
            <input
              id="graph-search"
              type="text"
              placeholder="Search nodes... (Ctrl+F)"
              className="px-2 py-1 text-xs bg-[#003666] text-[#ffffff] placeholder-[#7aa6da] border border-[#7aa6da20] rounded focus:outline-none focus:border-[#6699cc] w-48"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => networkRef.current?.fit()}
              className="px-3 py-1.5 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors"
              title="Fit to view (Ctrl+R)"
            >
              Fit
            </button>
            <button
              onClick={() => exportGraph('png')}
              className="px-3 py-1.5 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors"
            >
              Export PNG
            </button>
            <button
              onClick={() => exportGraph('json')}
              className="px-3 py-1.5 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={() => exportGraph('gremlin')}
              className="px-3 py-1.5 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors"
            >
              Export Gremlin
            </button>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="px-3 py-1.5 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors"
            >
              {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
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
        <div className="flex flex-1">
          {/* Left Panel - Controls & Query */}
          {!embedded && (
            <div className="w-80 bg-[#001733] border-r border-[#7aa6da20] flex flex-col">
              <GraphControls 
                settings={settings} 
                onSettingsChange={setSettings}
                onExport={exportGraph}
              />
              <GraphQueryPanel
                query={gremlinQuery}
                onQueryChange={setGremlinQuery}
                onExecute={executeGremlinQuery}
              />
              <GraphStats stats={graphStats} />
              <div className="p-4">
                <ColorLegend 
                  colorScheme={settings.colorScheme} 
                  showStatusIndicators={true}
                />
              </div>
            </div>
          )}
          
          {/* Graph Visualization */}
          <div className="flex-1 relative bg-[#002451]" style={{ minHeight: '400px' }}>
            <div ref={containerRef} className="w-full h-full" style={{ minHeight: '400px' }} />
            {filteredData.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-[#7aa6da]">
                  <p className="text-lg mb-2">No graph data available</p>
                  <p className="text-sm">Execute a pipeline to see the graph visualization</p>
                </div>
              </div>
            )}
            
            {/* Hover Info */}
            {hoveredNode && (
              <div className="absolute top-4 left-4 bg-[#001733] text-white p-2 rounded shadow-lg text-sm border border-[#7aa6da20]">
                Node: {hoveredNode}
              </div>
            )}
          </div>
          
          {/* Right Panel - Inspector */}
          {!embedded && (selectedNode || selectedEdge) && (
            <div className="w-96 bg-[#001733] border-l border-[#7aa6da20]">
              {selectedNode && (
                <NodeInspector 
                  node={selectedNode} 
                  onClose={() => setSelectedNode(null)} 
                />
              )}
              {selectedEdge && (
                <EdgeInspector 
                  edge={selectedEdge} 
                  onClose={() => setSelectedEdge(null)} 
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Edge Inspector Component
const EdgeInspector: React.FC<{ edge: GraphEdge; onClose: () => void }> = ({ edge, onClose }) => {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-[#bbdaff]">Edge Properties</h3>
        <button
          onClick={onClose}
          className="text-[#7aa6da] hover:text-white transition-colors"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-medium text-[#7aa6da]">Connection</h4>
          <p className="text-white text-sm">{edge.from} → {edge.to}</p>
        </div>
        
        {edge.label && (
          <div>
            <h4 className="text-xs font-medium text-[#7aa6da]">Label</h4>
            <p className="text-white text-sm">{edge.label}</p>
          </div>
        )}
        
        {edge.properties && Object.keys(edge.properties).length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-[#7aa6da] mb-2">Properties</h4>
            <div className="space-y-2">
              {Object.entries(edge.properties).map(([key, value]) => (
                <div key={key} className="bg-[#002451] rounded p-2">
                  <span className="text-[#7aa6da] text-xs">{key}:</span>
                  <pre className="text-white text-xs mt-1">{JSON.stringify(value, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};