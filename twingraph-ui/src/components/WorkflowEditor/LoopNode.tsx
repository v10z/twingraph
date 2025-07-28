import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export interface LoopData {
  label: string;
  loopType: 'for' | 'while' | 'forEach' | 'range';
  iterable: string;
  variable: string;
  condition?: string;
  maxIterations?: number;
  inputs: Array<{ name: string; type: string; description?: string }>;
  outputs: Array<{ name: string; type: string; description?: string }>;
  decoratorInputs: Record<string, any>;
  decoratorSchema?: any[];
}

interface LoopNodeProps extends NodeProps<LoopData> {}

export const LoopNode = memo(({ data, selected, id }: LoopNodeProps) => {
  const [expanded, setExpanded] = useState(true);
  
  const inputs = data?.inputs || [];
  const outputs = data?.outputs || [];
  const loopType = data?.loopType || 'for';
  const iterable = data?.iterable || 'items';
  const variable = data?.variable || 'item';
  const condition = data?.condition;
  const maxIterations = data?.maxIterations;
  
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

  const getLoopIcon = () => {
    switch (loopType) {
      case 'for': return '🔄';
      case 'while': return '🔁';
      case 'forEach': return '🔃';
      case 'range': return '📊';
      default: return '🔄';
    }
  };

  const getLoopExpression = () => {
    switch (loopType) {
      case 'for':
        return `for ${variable} in ${iterable}`;
      case 'while':
        return `while ${condition || 'condition'}`;
      case 'forEach':
        return `${iterable}.forEach(${variable})`;
      case 'range':
        return `for ${variable} in range(${maxIterations || 10})`;
      default:
        return `${loopType} loop`;
    }
  };
  
  return (
    <div
      className={`min-w-[320px] max-w-[400px] shadow-xl border-2 transition-all ${
        selected ? 'border-[#82aaff] shadow-2xl' : 'border-[#7aa6da20]'
      } bg-[#001733] rounded-lg overflow-hidden`}
    >
      {/* Header with circular loop indicator */}
      <div className="px-4 py-2 border-b border-[#7aa6da20] bg-[#002451]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#82aaff] rounded-full flex items-center justify-center text-sm border-2 border-[#001733]">
              <span className="text-[#001733] font-bold text-xs">{getLoopIcon()}</span>
            </div>
            <div className="text-sm font-bold text-[#ffffff]">{data?.label || 'Loop'}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7aa6da] bg-[#001733] px-2 py-1 rounded border border-[#82aaff]">
              {loopType.toUpperCase()}
            </span>
            {maxIterations && (
              <span className="text-xs text-[#82aaff] bg-[#001733] px-2 py-1 rounded border border-[#82aaff]">
                ×{maxIterations}
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[#7aa6da] hover:text-[#bbdaff] transition-colors"
            >
              {expanded ? '▼' : '▶'}
            </button>
          </div>
        </div>
        <div className="text-xs text-[#7aa6da] mt-1">
          Loop Control • {loopType} iteration
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
          
          {/* Loop Expression Section */}
          <div className="px-3 py-2 border-b border-[#7aa6da20] bg-[#001733]">
            <div className="text-xs font-medium text-[#bbdaff] mb-2 flex items-center gap-2">
              🔄 Loop Expression
            </div>
            <div className="bg-[#000d1a] border border-[#82aaff] rounded p-2">
              <pre className="text-xs text-[#82aaff] font-mono whitespace-pre-wrap">
                {getLoopExpression()}
              </pre>
            </div>
            {condition && loopType === 'while' && (
              <div className="mt-2 bg-[#000d1a] border border-[#ffcc66] rounded p-2">
                <div className="text-xs font-medium text-[#ffcc66] mb-1">Condition:</div>
                <pre className="text-xs text-[#ffcc66] font-mono">
                  {condition.length > 60 ? condition.substring(0, 60) + '...' : condition}
                </pre>
              </div>
            )}
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
      
      {/* Input Handle - Data to iterate */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-4 h-4 bg-[#82aaff] border-2 border-[#002451]"
        style={{ top: '30%' }}
      />
      
      {/* Condition Input Handle (for while loops) */}
      {loopType === 'while' && (
        <Handle
          type="target"
          position={Position.Left}
          id="condition"
          className="w-4 h-4 bg-[#ffcc66] border-2 border-[#002451]"
          style={{ top: '70%' }}
        />
      )}
      
      {/* Loop Body Output Handle - Each iteration */}
      <Handle
        type="source"
        position={Position.Right}
        id="body"
        className="w-4 h-4 bg-[#82aaff] border-2 border-[#002451]"
        style={{ top: '25%' }}
      />
      
      {/* Continue Output Handle - Next iteration */}
      <Handle
        type="source"
        position={Position.Right}
        id="continue"
        className="w-4 h-4 bg-[#99c794] border-2 border-[#002451]"
        style={{ top: '45%' }}
      />
      
      {/* Break Output Handle - Exit loop */}
      <Handle
        type="source"
        position={Position.Right}
        id="break"
        className="w-4 h-4 bg-[#f97b58] border-2 border-[#002451]"
        style={{ top: '65%' }}
      />
      
      {/* Completion Output Handle - After loop ends */}
      <Handle
        type="source"
        position={Position.Right}
        id="complete"
        className="w-4 h-4 bg-[#c594c5] border-2 border-[#002451]"
        style={{ top: '85%' }}
      />
      
      {/* Footer with loop info */}
      <div className="px-4 py-1 text-xs text-[#5a7ca7] border-t border-[#7aa6da20] bg-[#001733]">
        <div className="flex justify-between items-center">
          <span>{inputs.length + outputs.length} parameters • {loopType} loop</span>
          <div className="flex gap-2 text-xs">
            <span className="text-[#82aaff]">●</span> body
            <span className="text-[#99c794]">●</span> continue
            <span className="text-[#f97b58]">●</span> break
            <span className="text-[#c594c5]">●</span> complete
          </div>
        </div>
      </div>
    </div>
  );
});