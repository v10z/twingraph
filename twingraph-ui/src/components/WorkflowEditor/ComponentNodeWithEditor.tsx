import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';
import { EnhancedNestedWorkflowEditor } from './EnhancedNestedWorkflowEditor';
import { SubComponent } from './ComponentNode';

interface ComponentData {
  label: string;
  computeEnvironment: 'local' | 'docker' | 'kubernetes' | 'lambda' | 'batch' | 'celery' | 'slurm' | 'ssh';
  subComponents: SubComponent[];
  decoratorInputs: Record<string, any>;
  hash?: string;
  parentHash?: string;
  isInLoop?: boolean;
}

interface ComponentNodeProps extends NodeProps<ComponentData> {
  onAddSubComponent?: (nodeId: string, subComponent: any) => void;
  onUpdateSubComponents?: (nodeId: string, subComponents: SubComponent[]) => void;
  onEditCode?: (node: any) => void;
}

const environmentColors = {
  local: 'bg-[#99c794]',
  docker: 'bg-[#6699cc]',
  kubernetes: 'bg-[#82aaff]',
  lambda: 'bg-[#ffcc66]',
  batch: 'bg-[#f97b58]',
  celery: 'bg-[#c594c5]',
  slurm: 'bg-[#ff6b6b]',
  ssh: 'bg-[#4ecdc4]',
};

const environmentIcons = {
  local: '💻',
  docker: '🐳',
  kubernetes: '☸️',
  lambda: 'λ',
  batch: '🔲',
  celery: '🌿',
  slurm: '⚡',
  ssh: '🔗',
};

export const ComponentNodeWithEditor = memo(({ data, selected, id, onUpdateSubComponents, onEditCode }: ComponentNodeProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const bgColor = environmentColors[data?.computeEnvironment || 'local'];

  // Get connected edges and nodes from store with error handling
  const storeEdges = useStore((state) => state.edges);
  const storeNodes = useStore((state) => state.nodes);
  
  // Use memoization to compute connected nodes safely
  const { inputNodes, outputNodes } = useMemo(() => {
    try {
      const edges = storeEdges || [];
      const nodes = storeNodes || [];
      
      const incomingEdges = edges.filter(edge => edge && edge.target === id);
      const outgoingEdges = edges.filter(edge => edge && edge.source === id);
      
      const inputs = incomingEdges
        .map(edge => nodes.find(n => n && n.id === edge.source))
        .filter(node => node && node.data);
        
      const outputs = outgoingEdges
        .map(edge => nodes.find(n => n && n.id === edge.target))
        .filter(node => node && node.data);
        
      return { inputNodes: inputs, outputNodes: outputs };
    } catch (error) {
      console.error('Error computing connected nodes:', error);
      return { inputNodes: [], outputNodes: [] };
    }
  }, [storeEdges, storeNodes, id]);

  const handleUpdateSubComponents = useCallback((subComponents: SubComponent[]) => {
    if (onUpdateSubComponents) {
      onUpdateSubComponents(id, subComponents);
    }
  }, [id, onUpdateSubComponents]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        const newWidth = Math.max(300, Math.min(800, e.clientX - rect.left));
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      ref={nodeRef}
      className={`relative shadow-xl rounded-lg border-2 transition-all ${
        selected ? 'border-[#6699cc] shadow-2xl' : 'border-[#7aa6da20]'
      } bg-[#001733]`}
      style={{ width: `${width}px` }}
      onClick={(e) => {
        console.log('🟨 Component div clicked', id);
        // Don't stop propagation - let ReactFlow handle the click
      }}
      onDoubleClick={(e) => {
        console.log('🟧 Component div double-clicked', id);
        // Don't stop propagation - let ReactFlow handle the double-click
      }}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#7aa6da20] bg-[#002451] rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${bgColor} flex items-center justify-center text-xs`}>
              {environmentIcons[data?.computeEnvironment || 'local']}
            </div>
            <div className="text-sm font-bold text-[#ffffff]">{data?.label || 'Component'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Code edit button clicked', { id, data, onEditCode });
                onEditCode?.({ id, data, type: 'component' });
              }}
              className="px-2 py-1 text-xs rounded transition-colors bg-[#003666] text-[#bbdaff] hover:bg-[#00509d]"
              title="Edit Component Code"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
            <button
              onClick={() => setShowEditor(!showEditor)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                showEditor 
                  ? 'bg-[#6699cc] text-white' 
                  : 'bg-[#003666] text-[#bbdaff] hover:bg-[#00509d]'
              }`}
            >
              {showEditor ? 'Hide Editor' : 'Show Editor'}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[#7aa6da] hover:text-[#bbdaff] transition-colors"
            >
              {expanded ? '▼' : '▶'}
            </button>
          </div>
        </div>
        <div className="text-xs text-[#7aa6da] mt-1">
          {(data?.computeEnvironment || 'local').charAt(0).toUpperCase() + (data?.computeEnvironment || 'local').slice(1)} Environment
        </div>
        <div className="text-xs text-[#5a7ca7] mt-1 font-mono">
          {inputNodes.length > 0 ? 
            `parent_hash=[${inputNodes.map(() => 'hash').join(', ')}]` : 
            'parent_hash=[]'
          }
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex">
        {/* Inputs Section */}
        <div className="w-24 bg-[#002451] border-r border-[#7aa6da20] p-2">
          <div className="text-xs font-medium text-[#7aa6da] mb-2">Inputs</div>
          <div className="space-y-1">
            {inputNodes.length === 0 ? (
              <div className="text-xs text-[#5a7ca7] italic">None</div>
            ) : (
              inputNodes.map((node: any, index) => {
                return (
                  <div key={node?.id || `input-${index}`} className="text-xs">
                    <div className="text-[#bbdaff] font-mono">result['hash']</div>
                    <div className="text-[#5a7ca7] text-[10px]">from {node?.data?.label || 'previous'}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1">
          {/* Nested Workflow Editor */}
          {showEditor && (
            <div className="p-2">
              <EnhancedNestedWorkflowEditor
                componentId={id}
                subComponents={data?.subComponents || []}
                onUpdate={handleUpdateSubComponents}
                parentNode={{ id, data }}
              />
            </div>
          )}
          
          {/* Subcomponents List */}
          {expanded && !showEditor && (
            <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
              {(data?.subComponents || []).length === 0 ? (
                <div className="text-xs text-[#5a7ca7] text-center py-2">
                  No components added
                </div>
              ) : (
                data.subComponents.map((component, index) => (
                  <div
                    key={component.id}
                    className="bg-[#003666] border border-[#7aa6da20] rounded px-2 py-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[#bbdaff] font-medium">
                        {index + 1}. {component.name}
                      </span>
                      <span className="text-[#5a7ca7]">{component.type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Default content when collapsed */}
          {!expanded && !showEditor && (
            <div className="p-4 text-center">
              <div className="text-xs text-[#5a7ca7]">
                Click ▶ to expand or Show Editor for templates
              </div>
            </div>
          )}
        </div>

        {/* Outputs Section */}
        <div className="w-24 bg-[#002451] border-l border-[#7aa6da20] p-2">
          <div className="text-xs font-medium text-[#7aa6da] mb-2">Outputs</div>
          <div className="space-y-1">
            {outputNodes.length === 0 ? (
              <div className="text-xs text-[#5a7ca7] italic">None</div>
            ) : (
              outputNodes.map((node: any, index) => (
                <div key={node?.id || `output-${index}`} className="text-xs text-[#bbdaff] bg-[#003666] rounded px-1 py-0.5">
                  → {node?.data?.label || `Output ${index + 1}`}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Environment Info */}
      <div className="px-4 py-1 text-xs text-[#5a7ca7] border-t border-[#7aa6da20]">
        {(data?.subComponents || []).length} component{(data?.subComponents || []).length !== 1 ? 's' : ''}
        {showEditor && ' • Editor Mode'}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-2 h-full cursor-ew-resize bg-transparent hover:bg-[#6699cc20] transition-colors"
        onMouseDown={handleMouseDown}
        style={{ cursor: isResizing ? 'ew-resize' : 'ew-resize' }}
      />

      {/* Input/Output Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-4 h-4 bg-[#6699cc] border-2 border-[#002451]"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-4 h-4 bg-[#6699cc] border-2 border-[#002451]"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  );
});