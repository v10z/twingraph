import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface StartNodeData {
  label: string;
}

export const StartNode: React.FC<NodeProps<StartNodeData>> = ({ data, selected }) => {
  return (
    <div
      className={`px-4 py-3 shadow-xl rounded-lg border-2 transition-all ${
        selected ? 'border-[#6699cc] shadow-2xl' : 'border-[#7aa6da20]'
      } bg-[#001733]`}
    >
      {/* Header */}
      <div className="text-center">
        <div className="text-sm font-bold text-[#ffffff]">START</div>
        <div className="text-xs text-[#7aa6da] mt-1">Entry point</div>
        <div className="text-xs text-[#5a7ca7] mt-1 font-mono">parent_hash=[]</div>
      </div>
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-4 h-4 bg-[#99c794] border-2 border-[#002451]"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  );
};