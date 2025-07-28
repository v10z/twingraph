import React, { useState } from 'react';
import { ComponentSidebar } from '../WorkflowEditor/ComponentSidebar';
import { EnhancedGraphVisualization } from '../GraphVisualization/EnhancedGraphVisualization';
import { ThreeJSViewer } from '../Visualization/ThreeJSViewer';
import { D3Viewer } from '../Visualization/D3Viewer';

type TabType = 'components' | 'graph' | 'three' | 'd3';

interface Tab {
  id: TabType;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: 'components', label: 'Components', icon: '🧩' },
  { id: 'graph', label: 'Graph', icon: '🕸️' },
  { id: 'three', label: '3D View', icon: '🎮' },
  { id: 'd3', label: 'D3 Charts', icon: '📊' },
];

export const SidebarWithTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('components');

  return (
    <div className="flex h-full bg-[#001733]">
      {/* Tab buttons */}
      <div className="w-12 bg-[#002451] border-r border-[#7aa6da20] flex flex-col">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              w-full h-12 flex items-center justify-center text-lg transition-all
              ${activeTab === tab.id 
                ? 'bg-[#003666] text-[#ffffff] border-r-2 border-[#6699cc]' 
                : 'text-[#7aa6da] hover:bg-[#003666] hover:text-[#bbdaff]'
              }
            `}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'components' && <ComponentSidebar />}
        {activeTab === 'graph' && (
          <div className="h-full bg-[#002451]">
            <EnhancedGraphVisualization embedded={true} />
          </div>
        )}
        {activeTab === 'three' && <ThreeJSViewer />}
        {activeTab === 'd3' && <D3Viewer />}
      </div>
    </div>
  );
};