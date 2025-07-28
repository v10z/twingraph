import React, { useState, useEffect } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { GraphExecutionData, GraphVertex, GraphEdge } from '../../services/executionService';

interface ExecutionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  executionData?: GraphExecutionData;
  status: 'idle' | 'running' | 'completed' | 'failed';
  logs: string[];
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  isOpen,
  onClose,
  executionData,
  status,
  logs
}) => {
  const [network, setNetwork] = useState<Network | null>(null);
  const graphRef = React.useRef<HTMLDivElement>(null);
  
  // Initialize graph when panel opens
  useEffect(() => {
    if (isOpen && graphRef.current && !network) {
      const nodes = new DataSet<any>();
      const edges = new DataSet<any>();
      
      const options = {
        nodes: {
          shape: 'box',
          margin: 10,
          font: {
            color: '#ffffff',
            size: 14,
            face: 'monospace'
          },
          borderWidth: 2,
          shadow: true
        },
        edges: {
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 0.8
            }
          },
          color: {
            color: '#7aa6da',
            highlight: '#bbdaff',
            hover: '#99c0e0'
          },
          width: 2,
          smooth: {
            type: 'cubicBezier',
            roundness: 0.5
          }
        },
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'LR',
            sortMethod: 'directed',
            nodeSpacing: 200,
            levelSeparation: 300,
            treeSpacing: 100
          }
        },
        physics: {
          enabled: false
        },
        interaction: {
          hover: true,
          tooltipDelay: 100
        }
      };
      
      const networkInstance = new Network(graphRef.current, { nodes, edges }, options);
      setNetwork(networkInstance);
    }
  }, [isOpen, network]);
  
  // Update graph with execution data
  useEffect(() => {
    if (network && executionData) {
      const nodes = new DataSet<any>();
      const edges = new DataSet<any>();
      
      // Convert vertices to vis nodes
      executionData.vertices.forEach((vertex: GraphVertex) => {
        const isStart = vertex.label === 'START';
        const color = getNodeColor(vertex.properties.status);
        
        nodes.add({
          id: vertex.id,
          label: `${vertex.label}\n${vertex.properties.hash.substring(0, 8)}...`,
          color: {
            background: color.background,
            border: color.border,
            highlight: {
              background: color.highlight,
              border: color.border
            }
          },
          borderWidth: isStart ? 3 : 2,
          shape: isStart ? 'circle' : 'box',
          title: generateTooltip(vertex),
          mass: isStart ? 2 : 1
        });
      });
      
      // Convert edges to vis edges
      executionData.edges.forEach((edge: GraphEdge) => {
        edges.add({
          id: edge.id,
          from: edge.source,
          to: edge.target,
          label: edge.label,
          font: {
            color: '#5a7ca7',
            size: 10,
            align: 'horizontal'
          }
        });
      });
      
      network.setData({ nodes, edges });
      
      // Focus on the graph
      setTimeout(() => {
        network.fit({
          animation: {
            duration: 500,
            easingFunction: 'easeInOutQuad'
          }
        });
      }, 100);
    }
  }, [network, executionData]);
  
  const getNodeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          background: '#5a7ca7',
          border: '#7aa6da',
          highlight: '#7aa6da'
        };
      case 'running':
        return {
          background: '#ffcc66',
          border: '#f0b840',
          highlight: '#ffe099'
        };
      case 'completed':
        return {
          background: '#99c794',
          border: '#5fb14f',
          highlight: '#b3dbb0'
        };
      case 'failed':
        return {
          background: '#f97b58',
          border: '#e74c3c',
          highlight: '#ff9d82'
        };
      default:
        return {
          background: '#003666',
          border: '#6699cc',
          highlight: '#0052a3'
        };
    }
  };
  
  const generateTooltip = (vertex: GraphVertex) => {
    const props = vertex.properties;
    let tooltip = `<div style="background: #002451; padding: 10px; border: 1px solid #6699cc; border-radius: 4px; font-family: monospace; font-size: 12px; color: #ffffff;">`;
    tooltip += `<strong>${vertex.label}</strong><br/>`;
    tooltip += `Hash: ${props.hash}<br/>`;
    tooltip += `Status: ${props.status}<br/>`;
    tooltip += `Time: ${new Date(props.timestamp).toLocaleTimeString()}<br/>`;
    
    if (props.parent_hash && props.parent_hash.length > 0) {
      tooltip += `Parent Hash: [${props.parent_hash.join(', ')}]<br/>`;
    }
    
    if (props.inputs && Object.keys(props.inputs).length > 0) {
      tooltip += `<br/><strong>Inputs:</strong><br/>`;
      Object.entries(props.inputs).forEach(([key, value]) => {
        tooltip += `  ${key}: ${JSON.stringify(value)}<br/>`;
      });
    }
    
    if (props.outputs && Object.keys(props.outputs).length > 0) {
      tooltip += `<br/><strong>Outputs:</strong><br/>`;
      Object.entries(props.outputs).forEach(([key, value]) => {
        tooltip += `  ${key}: ${JSON.stringify(value)}<br/>`;
      });
    }
    
    tooltip += `</div>`;
    return tooltip;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-[#001733] border-2 border-[#6699cc] rounded-lg shadow-2xl w-[90vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#002451] border-b border-[#7aa6da20]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Pipeline Execution</h2>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              status === 'running' ? 'bg-[#ffcc66] text-black animate-pulse' :
              status === 'completed' ? 'bg-[#99c794] text-black' :
              status === 'failed' ? 'bg-[#f97b58] text-white' :
              'bg-[#5a7ca7] text-white'
            }`}>
              {status.toUpperCase()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7aa6da] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Graph Visualization */}
          <div className="flex-1 relative">
            <div className="absolute inset-0 m-4 bg-[#000d1a] border border-[#003666] rounded">
              <div ref={graphRef} className="w-full h-full" />
            </div>
          </div>
          
          {/* Execution Logs */}
          <div className="w-96 bg-[#002451] border-l border-[#7aa6da20] flex flex-col">
            <div className="px-4 py-3 border-b border-[#7aa6da20]">
              <h3 className="text-sm font-medium text-[#bbdaff]">Execution Logs</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              {logs.map((log, index) => (
                <div key={index} className="mb-2">
                  <span className="text-[#5a7ca7]">
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  <span className="text-[#bbdaff] ml-2">{log}</span>
                </div>
              ))}
              {status === 'running' && (
                <div className="text-[#ffcc66] animate-pulse">
                  Executing pipeline...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};