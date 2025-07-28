import React from 'react';
import ReactFlow, { Node, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'default',
    data: { label: 'Test Node 1' },
    position: { x: 250, y: 5 },
  },
  {
    id: '2',
    type: 'default', 
    data: { label: 'Test Node 2' },
    position: { x: 100, y: 100 },
  },
];

export const SimpleNodeTest: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '400px' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={initialNodes}
          onNodeClick={(event, node) => {
            console.log('✅ Simple test - Node clicked:', node);
            alert(`Clicked on ${node.data.label}`);
          }}
          onNodeDoubleClick={(event, node) => {
            console.log('✅ Simple test - Node double-clicked:', node);
            alert(`Double-clicked on ${node.data.label}`);
          }}
        />
      </ReactFlowProvider>
    </div>
  );
};