import React from 'react';

interface GraphStatsProps {
  stats?: {
    nodeCount: number;
    edgeCount: number;
    components: number;
    avgDegree: number;
    density: number;
  };
}

export const GraphStats: React.FC<GraphStatsProps> = ({ stats: providedStats }) => {
  // Default stats for demo purposes
  const stats = providedStats || {
    nodeCount: 24,
    edgeCount: 36,
    components: 3,
    avgDegree: 3.0,
    density: 0.12
  };
  return (
    <div className="p-4 space-y-3">
      <h4 className="text-[#bbdaff] font-semibold text-sm">Graph Statistics</h4>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#003666] rounded p-2 border border-[#7aa6da20] hover:bg-[#00509d] transition-colors">
          <div className="text-[#7aa6da] text-xs">Nodes</div>
          <div className="text-white font-semibold text-sm">{stats.nodeCount}</div>
        </div>
        
        <div className="bg-[#003666] rounded p-2 border border-[#7aa6da20] hover:bg-[#00509d] transition-colors">
          <div className="text-[#7aa6da] text-xs">Edges</div>
          <div className="text-white font-semibold text-sm">{stats.edgeCount}</div>
        </div>
        
        <div className="bg-[#003666] rounded p-2 border border-[#7aa6da20] hover:bg-[#00509d] transition-colors">
          <div className="text-[#7aa6da] text-xs">Components</div>
          <div className="text-white font-semibold text-sm">{stats.components}</div>
        </div>
        
        <div className="bg-[#003666] rounded p-2 border border-[#7aa6da20] hover:bg-[#00509d] transition-colors">
          <div className="text-[#7aa6da] text-xs">Avg Degree</div>
          <div className="text-white font-semibold text-sm">{stats.avgDegree}</div>
        </div>
      </div>
      
      <div className="bg-[#003666] rounded p-2 border border-[#7aa6da20]">
        <div className="text-[#7aa6da] text-xs">Graph Density</div>
        <div className="text-white font-semibold text-sm">{(stats.density * 100).toFixed(2)}%</div>
        <div className="mt-1 h-2 bg-[#002451] rounded overflow-hidden border border-[#7aa6da20]">
          <div 
            className="h-full bg-[#6699cc]"
            style={{ width: `${stats.density * 100}%` }}
          />
        </div>
      </div>
      
      {/* Additional Metrics */}
      <div className="pt-3 border-t border-[#7aa6da20] space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-[#7aa6da]">Clustering Coefficient</span>
          <span className="text-[#bbdaff]">0.42</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#7aa6da]">Diameter</span>
          <span className="text-[#bbdaff]">6</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#7aa6da]">Modularity</span>
          <span className="text-[#bbdaff]">0.68</span>
        </div>
      </div>
    </div>
  );
};