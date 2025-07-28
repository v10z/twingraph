import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Node, Edge } from 'reactflow';
import { generatePipelineCode } from '../../utils/codeGenerator';

interface PipelineCodeEditorProps {
  isOpen: boolean;
  onToggle: () => void;
  onExecute: (code: string) => void;
  nodes?: Node[];
  edges?: Edge[];
  pipelineName?: string;
}

const DEFAULT_CODE = `# TwinGraph Pipeline Definition
from twingraph import pipeline, component

@pipeline(
    graph_tracing=True,
    multipipeline=False,
    clear_graph=False
)
def my_pipeline():
    # Define your pipeline here
    
    # Example: Read data
    data = read_file(
        path="/data/input.csv",
        format="csv"
    )
    
    # Process data
    result = process_data(
        data=data['outputs']['content'],
        operation="transform"
    )
    
    # Write results
    write_file(
        content=result['outputs']['data'],
        path="/data/output.json",
        format="json"
    )
    
    return result

# Execute pipeline
my_pipeline()
`;

export const PipelineCodeEditor: React.FC<PipelineCodeEditorProps> = ({ 
  isOpen, 
  onToggle, 
  onExecute,
  nodes = [],
  edges = [],
  pipelineName = 'my_pipeline'
}) => {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isExecuting, setIsExecuting] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(true);

  // Auto-generate code when nodes/edges change
  useEffect(() => {
    if (autoGenerate && nodes.length > 0) {
      const generatedCode = generatePipelineCode(nodes, edges, pipelineName);
      setCode(generatedCode);
    }
  }, [nodes, edges, pipelineName, autoGenerate]);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await onExecute(code);
    } finally {
      setIsExecuting(false);
    }
  };

  const editorHeight = isOpen ? '300px' : '0px';

  return (
    <div 
      className={`w-full border-t border-[#7aa6da20] bg-[#001733] transition-all duration-300`}
      style={{ 
        height: isOpen ? '192px' : '40px',
        maxHeight: isOpen ? '192px' : '40px',
        minHeight: isOpen ? '192px' : '40px',
        flexShrink: 0
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#002451] border-b border-[#7aa6da20] h-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="text-xs text-[#7aa6da] hover:text-[#bbdaff] transition-colors"
          >
            {isOpen ? '▼' : '▶'}
          </button>
          <h3 className="text-sm font-medium text-[#bbdaff]">Pipeline Code Editor</h3>
          <span className="text-xs text-[#5a7ca7]">Write Python code to generate pipelines</span>
        </div>
        
        {isOpen && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-[#7aa6da]">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                className="w-3 h-3"
              />
              Auto-generate
            </label>
            <button
              onClick={() => {
                const generatedCode = generatePipelineCode(nodes, edges, pipelineName);
                setCode(generatedCode);
              }}
              className="px-3 py-1 text-xs text-[#7aa6da] hover:text-[#bbdaff] transition-colors"
            >
              Regenerate
            </button>
            <button
              onClick={() => setCode(DEFAULT_CODE)}
              className="px-3 py-1 text-xs text-[#7aa6da] hover:text-[#bbdaff] transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="px-4 py-1 text-xs bg-[#6699cc] text-white rounded hover:bg-[#82aaff] transition-colors disabled:opacity-50"
            >
              {isExecuting ? 'Executing...' : 'Execute'}
            </button>
          </div>
        )}
      </div>

      {/* Editor */}
      {isOpen && (
        <div style={{ height: '152px', overflow: 'hidden' }}>
          <Editor
            height="152px"
            defaultLanguage="python"
            theme="tomorrow-night-blue"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 11,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              padding: { top: 5, bottom: 5 },
            }}
          />
        </div>
      )}
    </div>
  );
};