import React from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';

interface LoopEdgeData {
  loopType: 'for' | 'while' | 'forEach';
  iterations?: number;
  condition?: string;
}

export const LoopEdge: React.FC<EdgeProps<LoopEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const loopType = data?.loopType || 'for';
  const iterations = data?.iterations;

  return (
    <g>
      {/* Main edge path */}
      <path
        id={id}
        d={edgePath}
        stroke="#6699cc"
        strokeWidth={3}
        fill="none"
        markerEnd={markerEnd}
      />
      
      {/* Second parallel path for double arrow effect */}
      <path
        d={edgePath}
        stroke="#6699cc"
        strokeWidth={2}
        strokeDasharray="0 8 0 8"
        strokeDashoffset="4"
        fill="none"
        opacity={0.7}
      />
      
      {/* Loop label */}
      <foreignObject
        x={sourceX + (targetX - sourceX) / 2 - 30}
        y={sourceY + (targetY - sourceY) / 2 - 10}
        width={60}
        height={20}
        className="overflow-visible"
      >
        <div className="bg-[#002451] border border-[#6699cc] rounded px-2 py-1 text-xs text-[#bbdaff] font-medium text-center shadow-lg">
          {loopType === 'for' && iterations ? `for(${iterations})` : loopType}
        </div>
      </foreignObject>
    </g>
  );
};