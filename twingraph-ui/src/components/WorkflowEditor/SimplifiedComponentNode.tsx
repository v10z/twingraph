import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';

interface ComponentData {
  label: string;
  computeEnvironment: 'local' | 'docker' | 'kubernetes' | 'lambda' | 'batch' | 'celery' | 'slurm' | 'ssh';
  decoratorInputs: Record<string, any>;
  code?: string;
  language?: 'python' | 'bash';
}

interface ComponentNodeProps extends NodeProps<ComponentData> {
  onEditCode?: (node: any) => void;
}

const environmentColors = {
  local: '#99c794',
  docker: '#6699cc',
  kubernetes: '#82aaff',
  lambda: '#ffcc66',
  batch: '#f97b58',
  celery: '#c594c5',
  slurm: '#ff6b6b',
  ssh: '#4ecdc4',
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

export const SimplifiedComponentNode = memo(({ data, selected, id, onEditCode }: ComponentNodeProps) => {
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const envColor = environmentColors[data?.computeEnvironment || 'local'];

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
        const newWidth = Math.max(350, Math.min(600, e.clientX - rect.left));
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

  // Get key decorator values for display
  const getKeyConfig = () => {
    const config = data?.decoratorInputs || {};
    const env = data?.computeEnvironment || 'local';
    
    switch(env) {
      case 'docker':
        return config.docker_id ? `🐳 ${config.docker_id}` : '🐳 No image specified';
      case 'kubernetes':
        return config.namespace ? `☸️ ${config.namespace}` : '☸️ default namespace';
      case 'lambda':
        return config.function_name ? `λ ${config.function_name}` : 'λ No function name';
      case 'batch':
        return config.job_definition ? `🔲 ${config.job_definition}` : '🔲 No job definition';
      case 'celery':
        return config.queue ? `🌿 Queue: ${config.queue}` : '🌿 default queue';
      case 'slurm':
        return config.partition ? `⚡ ${config.partition}` : '⚡ compute partition';
      case 'ssh':
        return config.hostname ? `🔗 ${config.hostname}` : '🔗 No host specified';
      default:
        return '💻 Local execution';
    }
  };

  // Get code preview (first 3 lines)
  const getCodePreview = () => {
    if (!data?.code) return null;
    const lines = data.code.split('\n').filter(line => line.trim());
    return lines.slice(0, 3).join('\n');
  };

  return (
    <div
      ref={nodeRef}
      className={`relative shadow-xl rounded-lg border-2 transition-all ${
        selected ? 'border-[#6699cc] shadow-2xl' : 'border-[#7aa6da20]'
      } bg-[#001733] overflow-hidden`}
      style={{ width: `${width}px` }}
    >
      {/* Header with environment badge */}
      <div className="px-4 py-3 bg-[#002451] border-b border-[#7aa6da20]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
              style={{ backgroundColor: envColor }}
            >
              {environmentIcons[data?.computeEnvironment || 'local']}
            </div>
            <div>
              <div className="text-sm font-bold text-[#ffffff]">{data?.label || 'Component'}</div>
              <div className="text-xs text-[#7aa6da]">{getKeyConfig()}</div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditCode?.({ id, data, type: 'component' });
            }}
            className="px-3 py-1.5 text-xs rounded transition-colors bg-[#003666] text-[#bbdaff] hover:bg-[#00509d] flex items-center gap-1"
            title="Edit Component Code"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Edit Code
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex" style={{ minHeight: '120px' }}>
        {/* Inputs Section */}
        <div className="w-28 bg-[#002451] border-r border-[#7aa6da20] p-3">
          <div className="text-xs font-medium text-[#7aa6da] mb-2">Inputs</div>
          <div className="space-y-2">
            {inputNodes.length === 0 ? (
              <div className="text-xs text-[#5a7ca7] italic">None</div>
            ) : (
              inputNodes.map((node: any, index) => (
                <div key={node?.id || `input-${index}`} className="text-xs bg-[#003666] rounded px-2 py-1">
                  <div className="text-[#bbdaff] font-mono text-[10px]">result['hash']</div>
                  <div className="text-[#5a7ca7] text-[10px] truncate">{node?.data?.label || 'input'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Code Preview Section */}
        <div className="flex-1 p-3">
          {data?.code ? (
            <div className="bg-[#000d1a] border border-[#003666] rounded p-2">
              <pre className="text-xs text-[#7aa6da] font-mono overflow-hidden">
                <code>{getCodePreview()}</code>
              </pre>
              {data.code.split('\n').length > 3 && (
                <div className="text-xs text-[#5a7ca7] mt-1">...{data.code.split('\n').length - 3} more lines</div>
              )}
            </div>
          ) : (
            <div className="bg-[#000d1a] border border-[#003666] rounded p-3 text-center">
              <div className="text-xs text-[#5a7ca7] italic">No code defined</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCode?.({ id, data, type: 'component' });
                }}
                className="mt-2 text-xs text-[#7aa6da] hover:text-[#bbdaff] underline"
              >
                Add code
              </button>
            </div>
          )}
        </div>

        {/* Outputs Section */}
        <div className="w-28 bg-[#002451] border-l border-[#7aa6da20] p-3">
          <div className="text-xs font-medium text-[#7aa6da] mb-2">Outputs</div>
          <div className="space-y-2">
            {outputNodes.length === 0 ? (
              <div className="text-xs text-[#5a7ca7] italic">None</div>
            ) : (
              outputNodes.map((node: any, index) => (
                <div key={node?.id || `output-${index}`} className="text-xs bg-[#003666] rounded px-2 py-1">
                  <div className="text-[#bbdaff] text-[10px] truncate">→ {node?.data?.label || 'output'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 text-xs text-[#5a7ca7] border-t border-[#7aa6da20] bg-[#001733] flex justify-between items-center">
        <span className="font-mono">
          parent_hash=[{inputNodes.map(() => 'hash').join(', ') || ''}]
        </span>
        <span className="text-[10px]">
          {data?.language === 'bash' ? '🖥️ Bash' : '🐍 Python'}
        </span>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-2 h-full cursor-ew-resize bg-transparent hover:bg-[#6699cc20] transition-colors"
        onMouseDown={handleMouseDown}
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