import React, { useState } from 'react';

interface GraphQueryPanelProps {
  query?: string;
  onQueryChange?: (query: string) => void;
  onExecute?: () => void;
}

export const GraphQueryPanel: React.FC<GraphQueryPanelProps> = ({
  query: initialQuery,
  onQueryChange,
  onExecute: onExecuteProp
}) => {
  const [query, setQuery] = useState(initialQuery || 'g.V().limit(10)');
  
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    onQueryChange?.(newQuery);
  };
  
  const onExecute = () => {
    console.log('Executing query:', query);
    onExecuteProp?.();
  };
  const [savedQueries, setSavedQueries] = useState<{ name: string; query: string }[]>([
    { name: 'All Nodes', query: 'g.V()' },
    { name: 'All Edges', query: 'g.E()' },
    { name: 'Failed Components', query: "g.V().has('status', 'failed')" },
    { name: 'Docker Components', query: "g.V().has('Platform', 'Docker')" },
    { name: 'Recent Executions', query: "g.V().order().by('Timestamp', desc).limit(10)" },
    { name: 'High Degree Nodes', query: "g.V().where(both().count().is(gt(5)))" },
    { name: 'Execution Path', query: "g.V().has('Type', 'PipelineStart').repeat(out()).until(has('Type', 'PipelineEnd')).path()" }
  ]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onExecute();
    }
  };

  return (
    <div className="p-4 space-y-4 border-b border-[#7aa6da20] flex-1 overflow-hidden flex flex-col">
      <h4 className="text-[#bbdaff] font-semibold text-sm">Gremlin Query</h4>
      
      {/* Query Editor */}
      <div className="flex-1 flex flex-col">
        <textarea
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter Gremlin query... (Ctrl+Enter to execute)"
          className="flex-1 px-3 py-2 bg-[#003666] text-white rounded text-xs font-mono focus:outline-none focus:border-[#6699cc] border border-[#7aa6da20] hover:bg-[#00509d] transition-colors resize-none"
          style={{ minHeight: '100px' }}
        />
        
        <button
          onClick={onExecute}
          className="mt-2 px-4 py-2 bg-[#6699cc] text-white rounded hover:bg-[#82aaff] text-sm font-medium transition-colors"
        >
          Execute Query
        </button>
      </div>
      
      {/* Saved Queries */}
      <div>
        <h5 className="text-[#7aa6da] text-xs mb-2">Saved Queries</h5>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {savedQueries.map((sq, index) => (
            <button
              key={index}
              onClick={() => handleQueryChange(sq.query)}
              className="w-full text-left px-2 py-1 bg-[#003666] text-[#bbdaff] rounded text-xs hover:bg-[#00509d] hover:text-white truncate transition-colors border border-[#7aa6da20]"
              title={sq.query}
            >
              {sq.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Query Help */}
      <details className="text-xs">
        <summary className="text-[#7aa6da] cursor-pointer hover:text-[#bbdaff] transition-colors">
          Query Examples
        </summary>
        <div className="mt-2 space-y-1 text-[#7aa6da]">
          <div>• Find by property: <code>g.V().has('Name', 'component1')</code></div>
          <div>• Traverse edges: <code>g.V('id').out('connects')</code></div>
          <div>• Count nodes: <code>g.V().count()</code></div>
          <div>• Group by type: <code>g.V().group().by('Type')</code></div>
        </div>
      </details>
    </div>
  );
};