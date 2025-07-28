import React, { useState } from 'react';
import { EnhancedGraphVisualization } from '../components/GraphVisualization/EnhancedGraphVisualization';
import { GraphQueryPanel } from '../components/GraphVisualization/GraphQueryPanel';
import { GraphStats } from '../components/GraphVisualization/GraphStats';
import { useWorkflowStore } from '../stores/workflowStore';

export const GraphVisualizationPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'full' | 'execution' | 'query'>('full');
  const { executions } = useWorkflowStore();

  return (
    <div className="h-full flex flex-col bg-[#001733]">
      {/* Header */}
      <div className="bg-[#002451] border-b border-[#003666] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#bbdaff]">Graph Visualization</h1>
            <p className="text-sm text-[#7aa6da] mt-1">
              Explore execution graphs and component relationships
            </p>
          </div>
          
          {/* View Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('full')}
              className={`px-4 py-2 rounded transition-colors ${
                activeView === 'full'
                  ? 'bg-[#6699cc] text-white'
                  : 'bg-[#003666] text-[#7aa6da] hover:bg-[#004080]'
              }`}
            >
              Full Graph
            </button>
            <button
              onClick={() => setActiveView('execution')}
              className={`px-4 py-2 rounded transition-colors ${
                activeView === 'execution'
                  ? 'bg-[#6699cc] text-white'
                  : 'bg-[#003666] text-[#7aa6da] hover:bg-[#004080]'
              }`}
            >
              Execution Graph
            </button>
            <button
              onClick={() => setActiveView('query')}
              className={`px-4 py-2 rounded transition-colors ${
                activeView === 'query'
                  ? 'bg-[#6699cc] text-white'
                  : 'bg-[#003666] text-[#7aa6da] hover:bg-[#004080]'
              }`}
            >
              Query Explorer
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Stats or Query */}
        <div className="w-80 bg-[#002451] border-r border-[#003666] flex flex-col">
          {activeView === 'query' ? (
            <GraphQueryPanel />
          ) : (
            <div className="p-4">
              <h3 className="text-lg font-medium text-[#bbdaff] mb-4">Graph Statistics</h3>
              <GraphStats />
              
              {activeView === 'execution' && executions.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-[#7aa6da] mb-2">Recent Executions</h4>
                  <div className="space-y-2">
                    {executions.slice(0, 5).map(execution => (
                      <div
                        key={execution.executionId}
                        className="p-2 bg-[#001733] rounded border border-[#003666] hover:border-[#6699cc] cursor-pointer transition-colors"
                      >
                        <div className="text-sm text-[#bbdaff]">{execution.workflowName}</div>
                        <div className="text-xs text-[#7aa6da]">
                          {new Date(execution.startTime).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Graph Visualization */}
        <div className="flex-1 relative" style={{ minHeight: '600px', height: '100%' }}>
          <EnhancedGraphVisualization embedded={true} />
        </div>
      </div>
    </div>
  );
};