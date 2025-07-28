import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/peer';
import { DataSet } from 'vis-data/peer';
import { useWorkflowStore } from '../../stores/workflowStore';
import { graphService } from '../../services/graphService';
import { NodeInspector } from './NodeInspector';

interface GraphNode {
  id: string;
  label: string;
  group?: string;
  properties?: Record<string, any>;
}

interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

interface GraphVisualizationProps {
  onClose?: () => void;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({ onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[], edges: GraphEdge[] }>({
    nodes: [],
    edges: []
  });
  
  const { currentWorkflow, executions } = useWorkflowStore();
  const currentExecution = executions[0];

  // Fetch graph data from TinkerGraph
  const fetchGraphData = async () => {
    try {
      if (currentExecution?.executionId) {
        const data = await graphService.getExecutionGraph(currentExecution.executionId);
        setGraphData(data);
      } else {
        // Try to get any available graph data (including last execution)
        const data = await graphService.getFullGraph(100);
        if (data.nodes.length > 0) {
          setGraphData(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    }
  };

  // Setup network visualization
  useEffect(() => {
    if (!containerRef.current) return;

    const nodes = new DataSet<any>(
      graphData.nodes.map(node => ({
        id: node.id,
        label: node.label || node.id,
        color: getNodeColor(node),
        shape: getNodeShape(node),
        font: { color: '#ffffff' },
        ...node.properties
      }))
    );

    const edges = new DataSet<any>(
      graphData.edges.map(edge => ({
        id: `${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        arrows: 'to',
        color: { color: '#848484' }
      }))
    );

    const options = {
      nodes: {
        borderWidth: 2,
        size: 30,
        font: {
          size: 14,
          face: 'Tahoma'
        }
      },
      edges: {
        width: 2,
        font: {
          size: 12,
          align: 'middle'
        },
        smooth: {
          type: 'cubicBezier',
          forceDirection: 'horizontal',
          roundness: 0.4
        }
      },
      layout: {
        hierarchical: {
          direction: 'LR',
          sortMethod: 'directed',
          levelSeparation: 200,
          nodeSpacing: 100
        }
      },
      physics: {
        enabled: false
      },
      interaction: {
        hover: true,
        tooltipDelay: 200
      }
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);
    networkRef.current = network;

    // Handle node selection
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

    // Update node colors based on execution status
    if (currentExecution) {
      Object.entries(currentExecution.nodes).forEach(([nodeId, status]) => {
        const color = getStatusColor(status.status);
        nodes.update({ id: nodeId, color });
      });
    }

    return () => {
      network.destroy();
    };
  }, [graphData, currentExecution]);

  // Auto-refresh every second during execution
  useEffect(() => {
    if (currentExecution?.status === 'running') {
      const interval = setInterval(fetchGraphData, 1000);
      return () => clearInterval(interval);
    } else {
      fetchGraphData(); // Fetch once when not running
    }
  }, [currentExecution]);
  
  // Initial load
  useEffect(() => {
    fetchGraphData();
  }, []);

  const getNodeColor = (node: GraphNode): string => {
    if (node.properties?.Platform) {
      const platformColors: Record<string, string> = {
        'Local': '#99c794',
        'Docker': '#6699cc',
        'Kubernetes': '#7aa6da',
        'Lambda': '#c695c6',
        'Batch': '#ec5f66'
      };
      return platformColors[node.properties.Platform] || '#5a7ca7';
    }
    return '#5a7ca7';
  };

  const getNodeShape = (node: GraphNode): string => {
    if (node.properties?.Type === 'PipelineStart') return 'circle';
    if (node.properties?.Type === 'PipelineEnd') return 'circle';
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

  return (
    <div className="w-full h-full relative bg-[#001733]">
      {/* Graph Visualization */}
      <div className="w-full h-full relative">
        <div className="absolute top-4 left-4 z-10 bg-[#001733] rounded-lg shadow-lg p-4 border border-[#7aa6da20]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-[#bbdaff]">TinkerGraph Visualization</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="text-[#7aa6da] hover:text-white ml-4 transition-colors"
                title="Close visualization"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="text-sm text-[#7aa6da]">
            {currentExecution ? (
              <>
                <p>Execution: {currentExecution.executionId}</p>
                <p>Status: <span className={`font-semibold ${
                  currentExecution.status === 'running' ? 'text-[#6699cc]' :
                  currentExecution.status === 'completed' ? 'text-[#99c794]' :
                  currentExecution.status === 'failed' ? 'text-[#f97b58]' :
                  'text-[#7aa6da]'
                }`}>{currentExecution.status}</span></p>
                <p>Nodes: {Object.keys(currentExecution.nodes).length}</p>
              </>
            ) : (
              <p>No execution running</p>
            )}
          </div>
        </div>
        
        <div ref={containerRef} className="w-full h-full" />
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[#001733] rounded-lg shadow-lg p-4 border border-[#7aa6da20]">
          <h4 className="text-sm font-semibold mb-2 text-[#bbdaff]">Legend</h4>
          <div className="space-y-1 text-xs text-[#7aa6da]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#99c794] rounded"></div>
              <span>Local/Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#6699cc] rounded"></div>
              <span>Docker/Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#7aa6da] rounded"></div>
              <span>Kubernetes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#c695c6] rounded"></div>
              <span>Lambda</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#ec5f66] rounded"></div>
              <span>Batch/Failed</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Node Inspector */}
      {selectedNode && (
        <div className="absolute top-0 right-0 h-full w-80 bg-[#002451] border-l border-[#003666] shadow-xl">
          <NodeInspector 
            node={selectedNode} 
            onClose={() => setSelectedNode(null)} 
          />
        </div>
      )}
    </div>
  );
};