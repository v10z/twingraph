import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { SimplifiedComponentNode } from './SimplifiedComponentNode';
import { ConditionalNode } from './ConditionalNode';
import { LoopNode } from './LoopNode';
import { StartNode } from './StartNode';
import { ControlFlowEdge } from './ControlFlowEdge';
import { LoopEdge } from './LoopEdge';
import { ConditionalEdge } from './ConditionalEdge';
import { EnhancedUnifiedSidebar } from '../Sidebar/EnhancedUnifiedSidebar';
import { EnhancedGraphVisualization } from '../GraphVisualization/EnhancedGraphVisualization';
import { CodeEditor } from './CodeEditor';
import { WorkflowToolbar } from './WorkflowToolbar';
import { DecoratorPanel } from './DecoratorPanel';
import { Pipeline } from './PipelineManager';
import { PipelineCodeEditor } from './PipelineCodeEditor';
import { ComponentCodeEditor } from './ComponentCodeEditor';
import { ExecutionPanel } from './ExecutionPanel';
import { useWorkflowStore } from '../../stores/workflowStore';
import { executePipeline, GraphExecutionData } from '../../services/executionService';

// Define edge types outside component to prevent recreation
const edgeTypes = {
  control: ControlFlowEdge,
  loop: LoopEdge,
  conditional: ConditionalEdge,
};

export const WorkflowEditor: React.FC = () => {
  // Initialize with start node
  const startNode = {
    id: 'start-node',
    type: 'start',
    position: { x: 50, y: 200 },
    data: { label: 'Start', hash: '1' },
  };

  const [pipelines, setPipelines] = useState<Pipeline[]>([
    {
      id: 'pipeline-1',
      name: 'Main Pipeline',
      nodes: [startNode],
      edges: [],
      isActive: true,
      color: '#6699cc',
    },
  ]);
  const [activePipelineId, setActivePipelineId] = useState('pipeline-1');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [showPipelineCodeEditor, setShowPipelineCodeEditor] = useState(false);
  const [showComponentCodeEditor, setShowComponentCodeEditor] = useState(false);
  const [showFullGraphVisualization, setShowFullGraphVisualization] = useState(false);
  const [showDecoratorPanel, setShowDecoratorPanel] = useState(true);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [executionGraphData, setExecutionGraphData] = useState<GraphExecutionData | undefined>();

  const { saveWorkflow } = useWorkflowStore();


  // Load nodes/edges when switching pipelines
  useEffect(() => {
    const pipeline = pipelines.find(p => p.id === activePipelineId);
    if (pipeline) {
      setNodes(pipeline.nodes);
      setEdges(pipeline.edges);
    }
  }, [activePipelineId]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      const edge = {
        ...params,
        type: 'control',
        data: { controlType: 'sequential' },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    console.log('🟢 Node clicked:', node);
    console.log('🟢 Setting selectedNode');
    setSelectedNode(node);
    // Don't automatically open code editor - let user click button if needed
    // DecoratorPanel will automatically show for any selectedNode
  }, []);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    console.log('🔴 Node double-clicked:', node);
    console.log('🔴 Node type:', node.type);
    console.log('🔴 Current showComponentCodeEditor:', showComponentCodeEditor);
    setSelectedNode(node);
    if (node.type === 'component') {
      console.log('🔴 Setting showComponentCodeEditor to true');
      setShowComponentCodeEditor(true);
    }
  }, [showComponentCodeEditor]);

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    // TODO: Show edge control flow configuration dialog
    console.log('Edge clicked:', edge);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);


  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Only accept reactflow drops (components and control flow), not templates
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) {
        // Check if it's a template drop and show a message
        const template = event.dataTransfer.getData('application/template');
        if (template) {
          console.log('⚠️ Templates can only be dropped into component editors');
        }
        return;
      }

      // We need to get the reactFlowInstance from the store if not available
      if (!reactFlowInstance) {
        console.warn('ReactFlow instance not ready');
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) {
        return;
      }

      // Project mouse position to flow coordinates
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const componentData = JSON.parse(type);
      const newNode: Node = {
        id: `${componentData.type || 'node'}-${Date.now()}`,
        type: componentData.type || 'component',
        position,
        selectable: true,
        data: componentData,
      };
      console.log('🟠 Dropped node:', newNode);

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const handleCodeUpdate = useCallback((code: string) => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                code,
              },
            };
          }
          return node;
        })
      );
    }
  }, [selectedNode, setNodes]);

  const handleDecoratorUpdate = useCallback((nodeId: string, decoratorInputs: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              decoratorInputs,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Handle adding subcomponents to compute units
  const handleAddSubComponent = useCallback((nodeId: string, subComponent: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const newSubComponent = {
            ...subComponent,
            id: `${subComponent.id}-${Date.now()}`,
            order: (node.data.subComponents?.length || 0) + 1,
            config: {},
          };
          return {
            ...node,
            data: {
              ...node.data,
              subComponents: [...(node.data.subComponents || []), newSubComponent],
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Handle updating subcomponents for compute units
  const handleUpdateSubComponents = useCallback((nodeId: string, subComponents: any[]) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              subComponents,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Pipeline management handlers
  const handleAddPipeline = useCallback(() => {
    const newStartNode = {
      id: `start-node-${Date.now()}`,
      type: 'start',
      position: { x: 50, y: 200 },
      data: { label: 'Start', hash: '1' },
    };
    
    const newPipeline: Pipeline = {
      id: `pipeline-${Date.now()}`,
      name: `Pipeline ${pipelines.length + 1}`,
      nodes: [newStartNode],
      edges: [],
      isActive: false,
      color: '#99c794', // Default to green, can be cycled
    };
    setPipelines(prev => [...prev, newPipeline]);
    setActivePipelineId(newPipeline.id);
  }, [pipelines.length]);

  const handleSelectPipeline = useCallback((id: string) => {
    // Save current pipeline state before switching
    if (activePipelineId) {
      setPipelines(prev => prev.map(p => 
        p.id === activePipelineId 
          ? { ...p, nodes, edges }
          : p
      ));
    }
    setActivePipelineId(id);
  }, [activePipelineId, nodes, edges]);

  const handleDeletePipeline = useCallback((id: string) => {
    if (pipelines.length === 1) return; // Can't delete last pipeline
    setPipelines(prev => prev.filter(p => p.id !== id));
    if (activePipelineId === id) {
      setActivePipelineId(pipelines[0].id);
    }
  }, [pipelines, activePipelineId]);

  const handleUpdatePipeline = useCallback((id: string, updates: Partial<Pipeline>) => {
    setPipelines(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  }, []);

  // Code execution handler
  const handleExecutePipelineCode = useCallback(async (code: string) => {
    try {
      // Clear previous execution data
      setExecutionLogs([]);
      setExecutionGraphData(undefined);
      setExecutionStatus('running');
      setShowExecutionPanel(true);
      
      // Execute the pipeline
      const result = await executePipeline(
        code,
        nodes,
        edges,
        (message, graphData) => {
          // Progress callback
          setExecutionLogs(prev => [...prev, message]);
          if (graphData) {
            setExecutionGraphData(graphData);
          }
        }
      );
      
      if (result.success) {
        setExecutionStatus('completed');
        setExecutionLogs(prev => [...prev, 'Pipeline execution completed successfully!']);
        if (result.outputs) {
          setExecutionLogs(prev => [...prev, `Final outputs: ${JSON.stringify(result.outputs, null, 2)}`]);
        }
        
        // Update the full graph visualization if it's open
        if (showFullGraphVisualization && result.graphData) {
          // The graph visualization will auto-update via the store
        }
      } else {
        setExecutionStatus('failed');
        setExecutionLogs(prev => [...prev, `Error: ${result.error || 'Unknown error'}`]);
      }
    } catch (error) {
      console.error('Failed to execute pipeline code:', error);
      setExecutionStatus('failed');
      setExecutionLogs(prev => [...prev, `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  }, [nodes, edges, showFullGraphVisualization]);

  const handleEditComponentCode = useCallback((node: Node) => {
    console.log('Edit component code clicked:', node);
    setSelectedNode(node);
    setShowComponentCodeEditor(true);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Delete selected node when Delete or Backspace is pressed
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode && !showCodeEditor) {
        // Don't delete start nodes
        if (selectedNode.type !== 'start') {
          setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
          setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
          setSelectedNode(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedNode, showCodeEditor, setNodes, setEdges]);

  // Create node types with memoization to prevent recreation on every render
  const nodeTypes = useMemo(() => ({
    start: StartNode,
    component: (props: any) => (
      <SimplifiedComponentNode 
        {...props} 
        onEditCode={handleEditComponentCode}
      />
    ),
    conditional: ConditionalNode,
    loop: LoopNode,
  }), [handleEditComponentCode]);

  return (
    <div className="h-screen w-full flex bg-[#002451]" style={{ height: '100vh' }}>
      
      {/* Enhanced Unified Sidebar with Pipeline Management */}
      <EnhancedUnifiedSidebar 
        pipelines={pipelines}
        activePipelineId={activePipelineId}
        onAddPipeline={handleAddPipeline}
        onSelectPipeline={handleSelectPipeline}
        onDeletePipeline={handleDeletePipeline}
        onUpdatePipeline={handleUpdatePipeline}
        showFullGraphVisualization={showFullGraphVisualization}
        onToggleFullGraphVisualization={() => setShowFullGraphVisualization(!showFullGraphVisualization)}
      />
        
      {/* Main content area with vertical layout */}
      <div className="flex-1 flex flex-col" style={{ height: '100vh' }}>
        {/* Top: ReactFlow editor and DecoratorPanel */}
        <div className="flex flex-row" style={{ 
          height: `calc(100vh - ${showPipelineCodeEditor ? 192 : 40}px - ${showComponentCodeEditor ? 300 : 0}px)`
        }}>
          <div className="flex-1 relative bg-[#002451]" style={{ height: '100%', width: '100%' }} ref={reactFlowWrapper}>
            <ReactFlowProvider>
              <ReactFlow
                onInit={(instance) => {
                  console.log('🔵 ReactFlow initialized');
                  setReactFlowInstance(instance);
                }}
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  onNodeDoubleClick={onNodeDoubleClick}
                  onEdgeClick={onEdgeClick}
                  onNodeDragStart={(event, node) => {
                    setIsDraggingNode(true);
                    setDraggedNodeId(node.id);
                  }}
                  onNodeDragStop={() => {
                    setIsDraggingNode(false);
                    setDraggedNodeId(null);
                  }}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1 }}
                  defaultViewport={{ x: 200, y: 200, zoom: 0.7 }}
                  style={{ background: '#002451', width: '100%', height: '100%' }}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onClick={(e) => console.log('🟣 Canvas clicked', e.target)}
                  nodesDraggable={true}
                  nodesConnectable={true}
                  elementsSelectable={true}
                >
                <Background color="#003666" gap={16} />
                <Controls className="bg-[#001733] border border-[#7aa6da20] rounded" />
                <MiniMap 
                  className="bg-[#001733] border border-[#7aa6da20]"
                  nodeColor="#003666"
                  maskColor="rgba(0, 36, 81, 0.8)"
                />
                <Panel position="top-center" className="mt-4">
                  <WorkflowToolbar 
                    onSave={() => saveWorkflow({ nodes, edges })}
                    onLoad={(workflow) => {
                      setNodes(workflow.nodes || []);
                      setEdges(workflow.edges || []);
                    }}
                    onToggleCodeEditor={() => setShowPipelineCodeEditor(!showPipelineCodeEditor)}
                    onToggleDecoratorPanel={() => setShowDecoratorPanel(!showDecoratorPanel)}
                  />
                </Panel>
                
                {/* Delete Zone */}
                <Panel position="top-right" className="mt-4 mr-4">
                  <div 
                    className={`
                      w-24 h-24 rounded-full flex items-center justify-center transition-all
                      ${isDraggingNode ? 'bg-[#f97b58] scale-110 animate-pulse' : 'bg-[#003666]'}
                      border-2 border-dashed ${isDraggingNode ? 'border-white' : 'border-[#7aa6da40]'}
                    `}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsOverDeleteZone(true);
                    }}
                    onDragLeave={() => setIsOverDeleteZone(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsOverDeleteZone(false);
                      if (draggedNodeId) {
                        setNodes((nds) => nds.filter(n => n.id !== draggedNodeId));
                        setEdges((eds) => eds.filter(e => e.source !== draggedNodeId && e.target !== draggedNodeId));
                        setDraggedNodeId(null);
                      }
                    }}
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                          className={isDraggingNode ? 'text-white' : 'text-[#7aa6da]'}
                        />
                      </svg>
                      <div className={`text-xs ${isDraggingNode ? 'text-white font-bold' : 'text-[#7aa6da]'}`}>
                        {isDraggingNode ? 'Drop to Delete' : 'Trash'}
                      </div>
                    </div>
                  </div>
                </Panel>
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          {showDecoratorPanel && (
            <DecoratorPanel 
              selectedNode={selectedNode}
              onUpdateNode={handleDecoratorUpdate}
            />
          )}
        </div>

        {/* Bottom: Component Code Editor */}
        <ComponentCodeEditor
          isOpen={showComponentCodeEditor}
          onToggle={() => setShowComponentCodeEditor(!showComponentCodeEditor)}
          selectedNode={selectedNode}
          onCodeUpdate={handleCodeUpdate}
        />
        
        {/* Bottom: Pipeline Code Editor */}
        <PipelineCodeEditor
          isOpen={showPipelineCodeEditor}
          onToggle={() => setShowPipelineCodeEditor(!showPipelineCodeEditor)}
          onExecute={handleExecutePipelineCode}
          nodes={nodes}
          edges={edges}
          pipelineName={pipelines.find(p => p.id === activePipelineId)?.name || 'pipeline'}
        />
      </div>

      {/* Modal editors and overlays */}
      {showCodeEditor && selectedNode && (
        <CodeEditor
          node={selectedNode}
          onClose={() => setShowCodeEditor(false)}
          onCodeChange={handleCodeUpdate}
        />
      )}
      
      {/* Full Page Graph Visualization Overlay */}
      {showFullGraphVisualization && (
        <EnhancedGraphVisualization 
          onClose={() => setShowFullGraphVisualization(false)}
          embedded={false}
        />
      )}
      
      {/* Execution Panel */}
      <ExecutionPanel
        isOpen={showExecutionPanel}
        onClose={() => setShowExecutionPanel(false)}
        executionData={executionGraphData}
        status={executionStatus}
        logs={executionLogs}
      />
    </div>
  );
};