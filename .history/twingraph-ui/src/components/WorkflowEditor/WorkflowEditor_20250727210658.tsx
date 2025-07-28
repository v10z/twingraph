import React, { useCallback, useState, useEffect, useRef } from 'react';
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
import { ComponentNodeWithEditor } from './ComponentNodeWithEditor';
import { ConditionalNode } from './ConditionalNode';
import { LoopNode } from './LoopNode';
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
import { useWorkflowStore } from '../../stores/workflowStore';

// Create enhanced node types with additional props
const createNodeTypes = (
  handleAddSubComponent: (nodeId: string, subComponent: any) => void,
  handleUpdateSubComponents: (nodeId: string, subComponents: any[]) => void,
  handleEditCode: (node: Node) => void
) => ({
  component: (props: any) => <ComponentNodeWithEditor {...props} onAddSubComponent={handleAddSubComponent} onUpdateSubComponents={handleUpdateSubComponents} onEditCode={handleEditCode} />,
  conditional: ConditionalNode,
  loop: LoopNode,
});

const edgeTypes = {
  control: ControlFlowEdge,
  loop: LoopEdge,
  conditional: ConditionalEdge,
};

export const WorkflowEditor: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([
    {
      id: 'pipeline-1',
      name: 'Main Pipeline',
      nodes: [],
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

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) {
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
        data: componentData,
      };

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
    const newPipeline: Pipeline = {
      id: `pipeline-${Date.now()}`,
      name: `Pipeline ${pipelines.length + 1}`,
      nodes: [],
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
      // TODO: Send code to backend for execution
      console.log('Executing pipeline code:', code);
      // For now, just try to parse and create nodes
      // This would be handled by the backend in production
    } catch (error) {
      console.error('Failed to execute pipeline code:', error);
    }
  }, []);

  const handleEditComponentCode = useCallback((node: Node) => {
    console.log('Edit component code clicked:', node);
    setSelectedNode(node);
    setShowComponentCodeEditor(true);
  }, []);

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
          height: `calc(100vh - ${showPipelineCodeEditor ? 192 : 40}px - ${showComponentCodeEditor ? 192 : 0}px)`
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
                  nodeTypes={createNodeTypes(handleAddSubComponent, handleUpdateSubComponents, handleEditComponentCode)}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1 }}
                  defaultViewport={{ x: 200, y: 200, zoom: 0.7 }}
                  style={{ background: '#002451', width: '100%', height: '100%' }}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
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
                <Panel position="top-right" className="mt-4 mr-4">
                  <div className="bg-[#003666] px-3 py-1 rounded text-xs text-[#bbdaff]">
                    <div>Nodes: {nodes.length}</div>
                    <div>Selected: {selectedNode?.id || 'none'}</div>
                    <div>CompEditor: {showComponentCodeEditor ? 'ON' : 'OFF'}</div>
                  </div>
                </Panel>
                <Panel position="top-left" className="mt-4 ml-4">
                  <button
                    onClick={() => {
                      console.log('🟡 Add Test Node clicked');
                      const decoratorSchemas = {
                        'local': [
                          { name: 'compute_environment', type: 'select', options: ['local', 'docker', 'kubernetes', 'lambda', 'batch', 'celery', 'slurm', 'ssh'], defaultValue: 'local', description: 'Compute environment' },
                          { name: 'graph_tracing', type: 'boolean', defaultValue: true, description: 'Enable graph tracing', category: 'pipeline' },
                        ],
                        'pipeline': [
                          { name: 'clear_graph', type: 'boolean', defaultValue: false, description: 'Clear graph before run' },
                          { name: 'multipipeline', type: 'boolean', defaultValue: false, description: 'Multi-pipeline support' },
                          { name: 'graph_config', type: 'json', defaultValue: '{"graph_endpoint": "ws://localhost:8182"}', description: 'Graph database config' },
                          { name: 'additional_attributes', type: 'json', defaultValue: '{"Classification": "Task", "Username": "User", "Version": "1.1"}', description: 'Additional metadata' },
                        ],
                      };
                      
                      const newNode: Node = {
                        id: `test-${Date.now()}`,
                        type: 'component',
                        position: { x: 100, y: 100 },
                        data: {
                          label: 'Test Component',
                          computeEnvironment: 'local',
                          subComponents: [],
                          decoratorInputs: {},
                          code: 'def process(input_data):\n    # Your processing code here\n    result = input_data\n    return {"result": result}',
                          language: 'python',
                          decoratorSchema: [
                            ...(decoratorSchemas['local'] || []),
                            ...(decoratorSchemas['pipeline'] || [])
                          ],
                        },
                      };
                      console.log('🟡 Creating node:', newNode);
                      setNodes((nds) => {
                        const updated = nds.concat(newNode);
                        console.log('🟡 Nodes after adding:', updated.length);
                        return updated;
                      });
                    }}
                    className="px-3 py-1 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors"
                  >
                    Add Test Node
                  </button>
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
    </div>
  );
};