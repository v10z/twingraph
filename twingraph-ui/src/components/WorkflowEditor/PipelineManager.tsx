import React, { useState } from 'react';

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  isActive: boolean;
  color: string;
}

interface PipelineManagerProps {
  pipelines: Pipeline[];
  activePipelineId: string;
  onAddPipeline: () => void;
  onSelectPipeline: (id: string) => void;
  onDeletePipeline: (id: string) => void;
  onUpdatePipeline: (id: string, updates: Partial<Pipeline>) => void;
}

const pipelineColors = [
  '#6699cc', // Blue
  '#99c794', // Green
  '#ffcc66', // Yellow
  '#f97b58', // Orange
  '#c594c5', // Purple
  '#5fb3b3', // Cyan
];

export const PipelineManager: React.FC<PipelineManagerProps> = ({
  pipelines,
  activePipelineId,
  onAddPipeline,
  onSelectPipeline,
  onDeletePipeline,
  onUpdatePipeline,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (pipeline: Pipeline) => {
    setEditingId(pipeline.id);
    setEditName(pipeline.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onUpdatePipeline(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const getNextColor = () => {
    const usedColors = pipelines.map(p => p.color);
    return pipelineColors.find(c => !usedColors.includes(c)) || pipelineColors[0];
  };

  return (
    <div className="bg-[#001733] border-b border-[#7aa6da20] px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-[#bbdaff]">Pipelines</h3>
        <button
          onClick={onAddPipeline}
          className="px-2 py-1 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors"
        >
          + Add Pipeline
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {pipelines.map((pipeline) => (
          <div
            key={pipeline.id}
            className={`
              flex items-center gap-2 px-3 py-1 rounded cursor-pointer transition-all
              ${activePipelineId === pipeline.id 
                ? 'bg-[#00509d] border-2 border-[#6699cc]' 
                : 'bg-[#002451] border-2 border-[#7aa6da20] hover:border-[#7aa6da40]'
              }
            `}
            onClick={() => onSelectPipeline(pipeline.id)}
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: pipeline.color }}
            />
            
            {editingId === pipeline.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleSaveEdit(pipeline.id)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit(pipeline.id);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent text-sm text-[#ffffff] outline-none border-b border-[#6699cc]"
                autoFocus
              />
            ) : (
              <span 
                className="text-sm text-[#ffffff]"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit(pipeline);
                }}
              >
                {pipeline.name}
              </span>
            )}

            <span className="text-xs text-[#7aa6da]">
              ({pipeline.nodes.length} nodes)
            </span>

            {pipelines.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePipeline(pipeline.id);
                }}
                className="ml-2 text-xs text-[#f97b58] hover:text-[#ff9999] transition-colors"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-[#5a7ca7]">
        Double-click to rename • Click to switch • Multi-pipeline mode {pipelines.length > 1 ? 'enabled' : 'disabled'}
      </div>
    </div>
  );
};