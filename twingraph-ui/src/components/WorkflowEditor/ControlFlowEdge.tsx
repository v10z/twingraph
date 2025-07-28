import React from 'react';
import { getBezierPath, EdgeProps, EdgeLabelRenderer, BaseEdge } from 'reactflow';

export type ControlFlowType = 'sequential' | 'conditional' | 'loop' | 'parallel';

interface ControlFlowEdgeData {
  controlType: ControlFlowType;
  condition?: string;
  loopConfig?: {
    iterator: string;
    maxIterations?: number;
  };
}

const controlFlowStyles: Record<ControlFlowType, { color: string; strokeDasharray?: string }> = {
  sequential: { color: '#7aa6da' },
  conditional: { color: '#ffcc66', strokeDasharray: '5 5' },
  loop: { color: '#99c794', strokeDasharray: '10 5' },
  parallel: { color: '#c594c5', strokeDasharray: '3 3' },
};

export const ControlFlowEdge: React.FC<EdgeProps<ControlFlowEdgeData>> = ({
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const controlType = data?.controlType || 'sequential';
  const style = controlFlowStyles[controlType];

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: style.color,
          strokeWidth: 2,
          strokeDasharray: style.strokeDasharray,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="bg-[#001733] border border-[#7aa6da20] rounded px-2 py-1 text-xs">
            {controlType === 'conditional' && (
              <div className="text-[#ffcc66]">
                <span className="font-medium">if:</span> {data?.condition || 'condition'}
              </div>
            )}
            {controlType === 'loop' && (
              <div className="text-[#99c794]">
                <span className="font-medium">for:</span> {data?.loopConfig?.iterator || 'item'}
                {data?.loopConfig?.maxIterations && (
                  <span className="text-[#5a7ca7]"> (max: {data.loopConfig.maxIterations})</span>
                )}
              </div>
            )}
            {controlType === 'parallel' && (
              <div className="text-[#c594c5] font-medium">parallel</div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};