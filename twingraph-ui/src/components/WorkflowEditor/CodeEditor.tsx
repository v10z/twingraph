import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Node } from 'reactflow';
import { SupportedLanguage } from '../../types/workflow';

interface CodeEditorProps {
  node: Node;
  onClose: () => void;
  onCodeChange: (code: string) => void;
}

const languageMap: Record<SupportedLanguage, string> = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  bash: 'shell',
  cpp: 'cpp',
  rust: 'rust',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ node, onClose, onCodeChange }) => {
  const [code, setCode] = useState(node.data.code || '');
  const [language, setLanguage] = useState<SupportedLanguage>(node.data.language || 'python');

  useEffect(() => {
    setCode(node.data.code || getDefaultCode(language));
  }, [node, language]);

  const getDefaultCode = (lang: SupportedLanguage): string => {
    const templates: Record<SupportedLanguage, string> = {
      python: `def process(inputs):
    """
    Process function for ${node.data.label}
    Args:
        inputs: Dictionary of input values
    Returns:
        Dictionary of output values
    """
    # Your code here
    outputs = {}
    
    return outputs`,
      javascript: `function process(inputs) {
    /**
     * Process function for ${node.data.label}
     * @param {Object} inputs - Input values
     * @returns {Object} Output values
     */
    // Your code here
    const outputs = {};
    
    return outputs;
}`,
      typescript: `interface Inputs {
  // Define input types
}

interface Outputs {
  // Define output types
}

function process(inputs: Inputs): Outputs {
    /**
     * Process function for ${node.data.label}
     */
    // Your code here
    const outputs: Outputs = {};
    
    return outputs;
}`,
      bash: `#!/bin/bash
# Process function for ${node.data.label}

# Read inputs from environment or arguments
# Your code here

# Output results
echo "{}"`,
      cpp: `#include <iostream>
#include <json/json.h>

Json::Value process(const Json::Value& inputs) {
    // Process function for ${node.data.label}
    Json::Value outputs;
    
    // Your code here
    
    return outputs;
}`,
      rust: `use serde_json::{json, Value};

fn process(inputs: Value) -> Value {
    // Process function for ${node.data.label}
    let mut outputs = json!({});
    
    // Your code here
    
    outputs
}`,
    };
    
    return templates[lang] || '';
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onCodeChange(newCode);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#001733] rounded-lg shadow-xl w-4/5 h-4/5 flex flex-col border border-[#7aa6da20]">
        <div className="flex justify-between items-center p-4 border-b border-[#003666]">
          <h2 className="text-xl font-semibold text-[#bbdaff]">
            Edit Code: {node.data.label}
          </h2>
          <div className="flex items-center gap-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="px-3 py-1 border border-[#7aa6da20] rounded bg-[#002451] text-[#bbdaff]"
            >
              {node.data.componentType?.supportedLanguages?.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <button
              onClick={onClose}
              className="text-[#7aa6da] hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="flex-1">
          <Editor
            height="100%"
            language={languageMap[language]}
            value={code}
            onChange={handleCodeChange}
            theme="tomorrow-night-blue"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-[#003666]">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#7aa6da20] rounded hover:bg-[#003666] text-[#7aa6da] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onCodeChange(code);
              onClose();
            }}
            className="px-4 py-2 bg-[#6699cc] text-white rounded hover:bg-[#82aaff] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};