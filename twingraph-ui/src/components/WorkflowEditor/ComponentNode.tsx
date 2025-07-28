import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface ComponentInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface ComponentOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface SubComponent {
  id: string;
  name: string;
  type: string;
  order: number;
  config: Record<string, any>;
}

interface ComponentData {
  label: string;
  computeEnvironment: 'local' | 'docker' | 'kubernetes' | 'lambda' | 'batch' | 'celery' | 'slurm' | 'ssh';
  inputs: ComponentInput[];
  outputs: ComponentOutput[];
  code: string;
  language: 'python' | 'bash';
  decoratorInputs: Record<string, any>;
  decoratorSchema?: any[];
}

interface ComponentNodeProps extends NodeProps<ComponentData> {
  onAddSubComponent?: (nodeId: string, subComponent: any) => void;
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

export const ComponentNode = memo(({ data, selected, id }: ComponentNodeProps) => {
  const [expanded, setExpanded] = useState(true);
  const bgColor = environmentColors[data?.computeEnvironment || 'local'];
  
  const inputs = data?.inputs || [];
  const outputs = data?.outputs || [];
  const code = data?.code || '';
  const language = data?.language || 'python';
  
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      string: 'text-[#99c794]',
      number: 'text-[#6699cc]',
      boolean: 'text-[#ffcc66]',
      object: 'text-[#c594c5]',
      array: 'text-[#f97b58]',
    };
    return colors[type] || 'text-[#7aa6da]';
  };
  
  return (
    <div
      className={`min-w-[320px] max-w-[400px] shadow-xl rounded-lg border-2 transition-all ${
        selected ? 'border-[#6699cc] shadow-2xl' : 'border-[#7aa6da20]'
      } bg-[#001733]`}
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
            <span className="text-xs text-[#7aa6da] bg-[#001733] px-2 py-1 rounded">
              {language.toUpperCase()}
            </span>
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
      </div>
      
      {expanded && (
        <>
          {/* Inputs Section */}
          <div className="px-3 py-2 border-b border-[#7aa6da20] bg-[#002451]">
            <div className="text-xs font-medium text-[#bbdaff] mb-2 flex items-center gap-2">
              📥 Inputs ({inputs.length})
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {inputs.length === 0 ? (
                <div className="text-xs text-[#5a7ca7] italic">No inputs defined</div>
              ) : (
                inputs.map((input, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-[#bbdaff] font-medium">{input.name}</span>
                    <span className={`${getTypeColor(input.type)} font-mono`}>{input.type}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Code Section */}
          <div className="px-3 py-2 border-b border-[#7aa6da20] bg-[#001733]">
            <div className="text-xs font-medium text-[#bbdaff] mb-2 flex items-center gap-2">
              ⚡ Code
              <span className="text-[#5a7ca7]">({code.split('\n').length} lines)</span>
            </div>
            <div className="bg-[#000d1a] border border-[#003666] rounded p-2 max-h-32 overflow-y-auto">
              {code ? (
                <pre className="text-xs text-[#7aa6da] font-mono whitespace-pre-wrap">
                  {code.length > 200 ? code.substring(0, 200) + '...' : code}
                </pre>
              ) : (
                <div className="text-xs text-[#5a7ca7] italic">No code defined</div>
              )}
            </div>
          </div>
          
          {/* Outputs Section */}
          <div className="px-3 py-2 bg-[#002451]">
            <div className="text-xs font-medium text-[#bbdaff] mb-2 flex items-center gap-2">
              📤 Outputs ({outputs.length})
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {outputs.length === 0 ? (
                <div className="text-xs text-[#5a7ca7] italic">No outputs defined</div>
              ) : (
                outputs.map((output, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-[#bbdaff] font-medium">{output.name}</span>
                    <span className={`${getTypeColor(output.type)} font-mono`}>{output.type}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Input/Output Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-4 h-4 bg-[#6699cc] border-2 border-[#002451]"
        style={{ top: '50%' }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-4 h-4 bg-[#6699cc] border-2 border-[#002451]"
        style={{ top: '50%' }}
      />
      
      {/* Environment Info */}
      <div className="px-4 py-1 text-xs text-[#5a7ca7] border-t border-[#7aa6da20] rounded-b-lg">
        {inputs.length + outputs.length} parameters • {language} code
      </div>
    </div>
  );
});