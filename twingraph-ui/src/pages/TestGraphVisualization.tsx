import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network/peer';
import { DataSet } from 'vis-data/peer';

export const TestGraphVisualization: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create test data
    const nodes = new DataSet([
      { id: 1, label: 'Node 1', color: '#6699cc' },
      { id: 2, label: 'Node 2', color: '#99c794' },
      { id: 3, label: 'Node 3', color: '#ffcc66' },
    ]);
    
    const edges = new DataSet([
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ]);
    
    const options = {
      nodes: {
        shape: 'box',
        borderWidth: 2,
        font: { color: 'white' }
      },
      edges: {
        color: '#7aa6da',
        arrows: { to: true }
      },
      physics: false
    };
    
    const network = new Network(containerRef.current, { nodes, edges }, options);
    
    return () => {
      network.destroy();
    };
  }, []);
  
  return (
    <div className="h-full flex flex-col bg-[#001733]">
      <div className="p-4">
        <h1 className="text-xl text-white">Test Graph Visualization</h1>
      </div>
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full bg-[#002451]" />
      </div>
    </div>
  );
};