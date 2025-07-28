import React from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';

interface ConditionalEdgeData {
  condition: string;
  branch: 'true' | 'false' | 'if' | 'else';
  expression?: string;
}

export const ConditionalEdge: React.FC<EdgeProps<ConditionalEdgeData>> = ({
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

  const branch = data?.branch || 'true';
  const condition = data?.condition || 'condition';
  
  // Different colors for true/false branches
  const strokeColor = branch === 'true' || branch === 'if' ? '#99c794' : '#f97b58';

  return (
    <g>
      {/* Main edge path */}
      <path
        id={id}
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={2.5}
        fill="none"
        markerEnd={markerEnd}
      />
      
      {/* Diamond pattern for conditional edges */}
      <path
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeDasharray="4 4"
        fill="none"
        opacity={0.6}
      />
      
      {/* Condition label */}
      <foreignObject
        x={sourceX + (targetX - sourceX) / 2 - 25}
        y={sourceY + (targetY - sourceY) / 2 - 12}
        width={50}
        height={24}
        className="overflow-visible"
      >
        <div 
          className="border rounded-full px-2 py-1 text-xs font-medium text-center shadow-lg"
          style={{
            backgroundColor: '#002451',
            borderColor: strokeColor,
            color: strokeColor
          }}
        >
          {branch === 'true' ? '✓' : branch === 'false' ? '✗' : branch === 'if' ? 'if' : 'else'}
        </div>
      </foreignObject>
    </g>
  );
};