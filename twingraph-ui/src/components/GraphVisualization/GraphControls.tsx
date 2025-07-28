import React from 'react';

interface GraphControlsProps {
  settings: {
    physics: boolean;
    hierarchical: boolean;
    clustering: boolean;
    nodeLabels: 'id' | 'label' | 'type' | 'custom';
    edgeLabels: boolean;
    colorScheme: 'platform' | 'status' | 'type' | 'community';
    layout: 'hierarchical' | 'force' | 'circular' | 'grid';
    nodeSize: 'uniform' | 'degree' | 'pagerank';
    showOrphans: boolean;
    animateTransitions: boolean;
  };
  onSettingsChange: (settings: any) => void;
  onExport: (format: 'png' | 'json' | 'gremlin') => void;
}

export const GraphControls: React.FC<GraphControlsProps> = ({ 
  settings, 
  onSettingsChange,
  onExport 
}) => {
  const updateSetting = (key: string, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="p-4 space-y-4 border-b border-[#7aa6da20]">
      <h4 className="text-[#bbdaff] font-semibold text-sm">Visualization Settings</h4>
      
      {/* Layout */}
      <div>
        <label className="text-[#7aa6da] text-xs">Layout</label>
        <select
          value={settings.layout}
          onChange={(e) => updateSetting('layout', e.target.value)}
          className="w-full mt-1 px-3 py-1 bg-[#003666] text-white rounded text-xs focus:outline-none focus:border-[#6699cc] border border-[#7aa6da20] hover:bg-[#00509d] transition-colors"
        >
          <option value="hierarchical">Hierarchical</option>
          <option value="force">Force-Directed</option>
          <option value="circular">Circular</option>
          <option value="grid">Grid</option>
        </select>
      </div>
      
      {/* Color Scheme */}
      <div>
        <label className="text-[#7aa6da] text-xs">Color Scheme</label>
        <select
          value={settings.colorScheme}
          onChange={(e) => updateSetting('colorScheme', e.target.value)}
          className="w-full mt-1 px-3 py-1 bg-[#003666] text-white rounded text-xs focus:outline-none focus:border-[#6699cc] border border-[#7aa6da20] hover:bg-[#00509d] transition-colors"
        >
          <option value="platform">By Platform</option>
          <option value="status">By Status</option>
          <option value="type">By Type</option>
          <option value="community">By Community</option>
        </select>
      </div>
      
      {/* Node Labels */}
      <div>
        <label className="text-[#7aa6da] text-xs">Node Labels</label>
        <select
          value={settings.nodeLabels}
          onChange={(e) => updateSetting('nodeLabels', e.target.value)}
          className="w-full mt-1 px-3 py-1 bg-[#003666] text-white rounded text-xs focus:outline-none focus:border-[#6699cc] border border-[#7aa6da20] hover:bg-[#00509d] transition-colors"
        >
          <option value="id">Node ID</option>
          <option value="label">Label</option>
          <option value="type">Type</option>
          <option value="custom">Custom (Name)</option>
        </select>
      </div>
      
      {/* Node Size */}
      <div>
        <label className="text-[#7aa6da] text-xs">Node Size</label>
        <select
          value={settings.nodeSize}
          onChange={(e) => updateSetting('nodeSize', e.target.value)}
          className="w-full mt-1 px-3 py-1 bg-[#003666] text-white rounded text-xs focus:outline-none focus:border-[#6699cc] border border-[#7aa6da20] hover:bg-[#00509d] transition-colors"
        >
          <option value="uniform">Uniform</option>
          <option value="degree">By Degree</option>
          <option value="pagerank">By PageRank</option>
        </select>
      </div>
      
      {/* Toggles */}
      <div className="space-y-2">
        <label className="flex items-center text-[#bbdaff] text-xs cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={settings.physics}
            onChange={(e) => updateSetting('physics', e.target.checked)}
            className="mr-2 accent-[#6699cc]"
          />
          Enable Physics
        </label>
        
        <label className="flex items-center text-[#bbdaff] text-xs cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={settings.edgeLabels}
            onChange={(e) => updateSetting('edgeLabels', e.target.checked)}
            className="mr-2 accent-[#6699cc]"
          />
          Show Edge Labels
        </label>
        
        <label className="flex items-center text-[#bbdaff] text-xs cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={settings.showOrphans}
            onChange={(e) => updateSetting('showOrphans', e.target.checked)}
            className="mr-2 accent-[#6699cc]"
          />
          Show Orphan Nodes
        </label>
        
        <label className="flex items-center text-[#bbdaff] text-xs cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={settings.animateTransitions}
            onChange={(e) => updateSetting('animateTransitions', e.target.checked)}
            className="mr-2 accent-[#6699cc]"
          />
          Animate Transitions
        </label>
      </div>
      
      {/* Export Options */}
      <div className="pt-4 border-t border-[#7aa6da20]">
        <h5 className="text-[#7aa6da] text-xs mb-2">Export Graph</h5>
        <div className="flex gap-2">
          <button
            onClick={() => onExport('gremlin')}
            className="flex-1 px-2 py-1 bg-[#003666] text-[#bbdaff] rounded text-xs hover:bg-[#00509d] transition-colors border border-[#7aa6da20]"
          >
            Gremlin Script
          </button>
          <button
            onClick={() => onExport('json')}
            className="flex-1 px-2 py-1 bg-[#003666] text-[#bbdaff] rounded text-xs hover:bg-[#00509d] transition-colors border border-[#7aa6da20]"
          >
            JSON
          </button>
          <button
            onClick={() => onExport('png')}
            className="flex-1 px-2 py-1 bg-[#003666] text-[#bbdaff] rounded text-xs hover:bg-[#00509d] transition-colors border border-[#7aa6da20]"
          >
            PNG
          </button>
        </div>
      </div>
    </div>
  );
};