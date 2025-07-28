import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface ConditionalData {
  label: string;
  condition: string;
  conditionType: 'if' | 'switch' | 'ternary';
  inputs: Array<{ name: string; type: string; description?: string }>;
  outputs: Array<{ name: string; type: string; description?: string }>;
  decoratorInputs: Record<string, any>;
  decoratorSchema?: any[];
}

interface ConditionalNodeProps extends NodeProps<ConditionalData> {}

export const ConditionalNode = memo(({ data, selected, id }: ConditionalNodeProps) => {
  const [expanded, setExpanded] = useState(true);
  
  const inputs = data?.inputs || [];
  const outputs = data?.outputs || [];
  const condition = data?.condition || 'condition';
  const conditionType = data?.conditionType || 'if';
  
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
      className={`min-w-[280px] max-w-[350px] shadow-xl rounded-lg border-2 transition-all ${
        selected ? 'border-[#ffcc66] shadow-2xl' : 'border-[#7aa6da20]'
      } bg-[#001733]`}
    >
      {/* Header with diamond shape indicator */}
      <div className="px-4 py-2 border-b border-[#7aa6da20] bg-[#002451] rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#ffcc66] transform rotate-45 flex items-center justify-center text-xs">
              <span className="transform -rotate-45 text-[#002451] font-bold">?</span>
            </div>
            <div className="text-sm font-bold text-[#ffffff]">{data?.label || 'Conditional'}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7aa6da] bg-[#001733] px-2 py-1 rounded">
              {conditionType.toUpperCase()}
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
          Conditional Logic • {conditionType} statement
        </div>
      </div>
      
      {expanded && (
        <>
          {/* Inputs Section */}
          <div className="px-3 py-2 border-b border-[#7aa6da20] bg-[#002451]">
            <div className="text-xs font-medium text-[#bbdaff] mb-2 flex items-center gap-2">
              📥 Inputs ({inputs.length})
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
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
          
          {/* Condition Section */}
          <div className="px-3 py-2 border-b border-[#7aa6da20] bg-[#001733]">
            <div className="text-xs font-medium text-[#bbdaff] mb-2 flex items-center gap-2">
              🔀 Condition
            </div>
            <div className="bg-[#000d1a] border border-[#ffcc66] rounded p-2">
              <pre className="text-xs text-[#ffcc66] font-mono whitespace-pre-wrap">
                {condition.length > 100 ? condition.substring(0, 100) + '...' : condition}
              </pre>
            </div>
          </div>
          
          {/* Outputs Section */}
          <div className="px-3 py-2 bg-[#002451]">
            <div className="text-xs font-medium text-[#bbdaff] mb-2 flex items-center gap-2">
              📤 Outputs ({outputs.length})
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
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
      
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-4 h-4 bg-[#ffcc66] border-2 border-[#002451]"
        style={{ top: '50%' }}
      />
      
      {/* True Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-4 h-4 bg-[#99c794] border-2 border-[#002451]"
        style={{ top: '35%' }}
      />
      
      {/* False Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="w-4 h-4 bg-[#f97b58] border-2 border-[#002451]"
        style={{ top: '65%' }}
      />
      
      {/* Footer */}
      <div className="px-4 py-1 text-xs text-[#5a7ca7] border-t border-[#7aa6da20] rounded-b-lg">
        {inputs.length + outputs.length} parameters • {conditionType} logic
      </div>
    </div>
  );
});