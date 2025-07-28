import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Node } from 'reactflow';
import { generateComponentCode } from '../../utils/codeGenerator';

interface ComponentCodeEditorProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedNode: Node | null;
  onCodeUpdate: (code: string) => void;
}

const DEFAULT_PYTHON_CODE = `def process(input_data):
    # Your processing code here
    result = input_data
    return {"result": result}`;

const DEFAULT_BASH_CODE = `#!/bin/bash
# Your bash script here
echo "Processing..."`;

export const ComponentCodeEditor: React.FC<ComponentCodeEditorProps> = ({ 
  isOpen, 
  onToggle, 
  selectedNode,
  onCodeUpdate 
}) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<'python' | 'bash'>('python');

  // Update code when selected node changes
  useEffect(() => {
    if (selectedNode?.data.code) {
      setCode(selectedNode.data.code);
      setLanguage(selectedNode.data.language || 'python');
    } else if (selectedNode) {
      // Generate code based on component configuration
      const generatedCode = generateComponentCode(selectedNode as any);
      setCode(generatedCode);
      setLanguage('python');
    } else {
      setCode(language === 'python' ? DEFAULT_PYTHON_CODE : DEFAULT_BASH_CODE);
    }
  }, [selectedNode]);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    if (selectedNode) {
      onCodeUpdate(newCode);
    }
  };

  const handleLanguageChange = (newLang: 'python' | 'bash') => {
    setLanguage(newLang);
    const defaultCode = newLang === 'python' ? DEFAULT_PYTHON_CODE : DEFAULT_BASH_CODE;
    setCode(defaultCode);
    if (selectedNode) {
      onCodeUpdate(defaultCode);
    }
  };

  return (
    <div 
      className={`w-full border-t-2 ${isOpen ? 'border-[#6699cc] animate-pulse-once' : 'border-[#7aa6da20]'} bg-[#001733] transition-all duration-300 ${isOpen ? 'shadow-[0_-10px_30px_rgba(102,153,204,0.3)]' : ''}`}
      style={{ 
        height: isOpen ? '300px' : '0px',
        maxHeight: isOpen ? '300px' : '0px',
        minHeight: isOpen ? '300px' : '0px',
        flexShrink: 0,
        overflow: 'hidden'
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#002451] to-[#003666] border-b border-[#6699cc] h-12">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="text-sm text-[#bbdaff] hover:text-white transition-colors font-bold"
          >
            {isOpen ? '▼' : '▶'}
          </button>
          <svg className="w-4 h-4 text-[#6699cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h3 className="text-base font-bold text-white">Component Code Editor</h3>
          {selectedNode && (
            <span className="text-sm text-[#bbdaff] bg-[#003666] px-3 py-1 rounded-full">
              {selectedNode.data.label || 'Component'} - {selectedNode.data.computeEnvironment || 'local'}
            </span>
          )}
        </div>
        
        {isOpen && selectedNode && (
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as 'python' | 'bash')}
              className="px-2 py-1 text-xs bg-[#003666] text-[#bbdaff] border border-[#7aa6da20] rounded"
            >
              <option value="python">Python</option>
              <option value="bash">Bash</option>
            </select>
            <button
              onClick={() => {
                if (selectedNode) {
                  const generatedCode = generateComponentCode(selectedNode as any);
                  setCode(generatedCode);
                  onCodeUpdate(generatedCode);
                }
              }}
              className="px-3 py-1 text-xs text-[#7aa6da] hover:text-[#bbdaff] transition-colors"
            >
              Regenerate
            </button>
            <button
              onClick={() => {
                const defaultCode = language === 'python' ? DEFAULT_PYTHON_CODE : DEFAULT_BASH_CODE;
                setCode(defaultCode);
                if (selectedNode) {
                  onCodeUpdate(defaultCode);
                }
              }}
              className="px-3 py-1 text-xs text-[#7aa6da] hover:text-[#bbdaff] transition-colors"
            >
              Reset
            </button>
            <button
              onClick={onToggle}
              className="px-3 py-1 text-xs text-[#f97b58] hover:text-[#ff8a65] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Editor */}
      {selectedNode && (
        <div style={{ height: '252px', overflow: 'hidden' }}>
          <Editor
            height="252px"
            defaultLanguage={language}
            language={language}
            theme="tomorrow-night-blue"
            value={code}
            onChange={handleCodeChange}
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