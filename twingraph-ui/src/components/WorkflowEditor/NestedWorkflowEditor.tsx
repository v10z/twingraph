import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { theme } from '../../styles/theme';

interface SubComponentNode extends Node {
  data: {
    label: string;
    type: string;
    config: Record<string, any>;
  };
}

interface NestedWorkflowEditorProps {
  componentId: string;
  subComponents: any[];
  onUpdate: (subComponents: any[]) => void;
}

// Custom node component for subcomponents
const SubComponentNodeComponent: React.FC<{ data: any; selected?: boolean }> = ({ data, selected }) => {
  return (
    <div className={`px-3 py-2 rounded-lg transition-all duration-150 ${
      selected 
        ? 'bg-[#00509d] border-2 border-[#6699cc] shadow-lg' 
        : 'bg-[#003666] border border-[#7aa6da20] hover:bg-[#003f88] hover:border-[#6699cc]'
    }`}>
      <div className="text-xs font-medium text-white">{data.label}</div>
      <div className="text-xs text-[#7aa6da]">{data.type}</div>
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="mt-1 text-xs text-[#99c794]">Configured</div>
      )}
    </div>
  );
};

const nodeTypes = {
  subComponent: SubComponentNodeComponent,
};

export const NestedWorkflowEditor: React.FC<NestedWorkflowEditorProps> = ({
  computeUnitId,
  subComponents,
  onUpdate,
}) => {
  // Convert subComponents to nodes and edges
  const initialNodes: Node[] = subComponents.map((comp, index) => ({
    id: comp.id,
    type: 'subComponent',
    position: { x: 100 + index * 200, y: 100 },
    data: {
      label: comp.name,
      type: comp.type,
      config: comp.config,
    },
  }));

  const initialEdges: Edge[] = subComponents
    .slice(0, -1)
    .map((comp, index) => ({
      id: `e${comp.id}-${subComponents[index + 1].id}`,
      source: comp.id,
      target: subComponents[index + 1].id,
      type: 'smoothstep',
    }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Update parent component when nodes/edges change
  useEffect(() => {
    const updatedComponents = nodes.map(node => ({
      id: node.id,
      name: node.data.label,
      type: node.data.type,
      config: node.data.config || {},
      position: node.position
    }));
    onUpdate(updatedComponents);
  }, [nodes, onUpdate]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const subComponentData = event.dataTransfer.getData('subComponent');
      if (!subComponentData) return;

      const component = JSON.parse(subComponentData);
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `${component.id}-${Date.now()}`,
        type: 'subComponent',
        position,
        data: {
          label: component.name,
          type: component.type,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
      
      // Auto-connect to previous node if exists
      if (nodes.length > 0) {
        const lastNode = nodes[nodes.length - 1];
        const newEdge = {
          id: `e${lastNode.id}-${newNode.id}`,
          source: lastNode.id,
          target: newNode.id,
          type: 'smoothstep',
        };
        setEdges((eds) => eds.concat(newEdge));
      }
    },
    [setNodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNodeId) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedNode();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [deleteSelectedNode]);

  return (
    <div className="h-96 bg-[#002451] border border-[#7aa6da20] rounded-lg overflow-hidden">
      <div className="h-full">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes.map(node => ({
              ...node,
              selected: node.id === selectedNodeId
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: '#002451' }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: {
                stroke: theme.colors.components.edge.default,
                strokeWidth: 2
              }
            }}
          >
            <Background 
              color={theme.colors.bg.tertiary} 
              gap={16} 
              size={1} 
            />
            <Controls 
              className="bg-[#001733] border border-[#7aa6da20] rounded"
              style={{
                button: {
                  backgroundColor: theme.colors.bg.secondary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.ui.border}`,
                  borderRadius: '4px'
                }
              }}
            />
            <MiniMap 
              className="bg-[#001733] border border-[#7aa6da20]"
              nodeColor={node => node.selected ? theme.colors.components.node.selected : theme.colors.components.node.default}
              maskColor={theme.colors.bg.glass}
              pannable
              zoomable
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      {selectedNodeId && (
        <div className="absolute bottom-4 right-4 bg-[#001733] border border-[#7aa6da20] rounded-lg p-2">
          <button
            onClick={deleteSelectedNode}
            className="px-3 py-1 text-xs bg-[#f97b58] text-white rounded hover:bg-[#f85a34] transition-colors"
          >
            Delete Node
          </button>
        </div>
      )}
    </div>
  );
};