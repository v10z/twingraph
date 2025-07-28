import React, { useState, useEffect, useRef } from 'react';
import { Node } from 'reactflow';

interface DecoratorPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, decoratorInputs: Record<string, any>) => void;
}

type FileFormat = 'json' | 'csv' | 'text' | 'yaml' | 'xml';

export const DecoratorPanel: React.FC<DecoratorPanelProps> = ({ selectedNode, onUpdateNode }) => {
  const [decoratorValues, setDecoratorValues] = useState<Record<string, any>>({});
  const [fileFormat, setFileFormat] = useState<FileFormat>('json');
  const [filePath, setFilePath] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedNode?.data.decoratorInputs) {
      setDecoratorValues(selectedNode.data.decoratorInputs);
    } else if (selectedNode?.data.decoratorSchema) {
      // Initialize with default values
      const defaults: Record<string, any> = {};
      selectedNode.data.decoratorSchema.forEach((field: any) => {
        defaults[field.name] = field.defaultValue || '';
      });
      setDecoratorValues(defaults);
    }
  }, [selectedNode]);

  const handleValueChange = (fieldName: string, value: any) => {
    const newValues = { ...decoratorValues, [fieldName]: value };
    setDecoratorValues(newValues);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, newValues);
    }
  };


  const handleFileLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsedData: Record<string, any> = {};

      switch (fileFormat) {
        case 'json':
          parsedData = JSON.parse(text);
          break;
        case 'csv':
          // Simple CSV parsing - assumes first row is headers
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim());
          if (lines.length > 1) {
            const values = lines[1].split(',').map(v => v.trim());
            headers.forEach((header, index) => {
              parsedData[header] = values[index] || '';
            });
          }
          break;
        case 'text':
          // Parse key=value format
          text.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key) {
              parsedData[key.trim()] = valueParts.join('=').trim();
            }
          });
          break;
        case 'yaml':
          // Simple YAML parsing
          text.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && !line.startsWith(' ')) {
              parsedData[key.trim()] = valueParts.join(':').trim();
            }
          });
          break;
        case 'xml':
          // Basic XML parsing using regex
          const xmlRegex = /<(\w+)>([^<]+)<\/\1>/g;
          let match;
          while ((match = xmlRegex.exec(text)) !== null) {
            parsedData[match[1]] = match[2];
          }
          break;
      }

      // Merge parsed data with existing values
      const newValues = { ...decoratorValues, ...parsedData };
      setDecoratorValues(newValues);
      if (selectedNode) {
        onUpdateNode(selectedNode.id, newValues);
      }
      setFilePath(file.name);
    } catch (error) {
      console.error('Failed to parse file:', error);
      alert('Failed to parse file. Please check the format.');
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-80 bg-[#001733] border-l border-[#7aa6da20] p-4">
        <p className="text-sm text-[#5a7ca7]">Select a component to configure</p>
      </div>
    );
  }


  return (
    <div className="w-80 bg-[#001733] border-l border-[#7aa6da20] p-4 overflow-y-auto">
      <h3 className="text-sm font-medium text-[#bbdaff] mb-4 uppercase">
        Component Properties
      </h3>
      
      {/* Debug info */}
      <div className="mb-4 p-2 bg-[#002451] rounded text-xs">
        <div className="text-[#7aa6da]">Selected: {selectedNode.id}</div>
        <div className="text-[#7aa6da]">Type: {selectedNode.type}</div>
        <div className="text-[#7aa6da]">Environment: {selectedNode.data.computeEnvironment || 'local'}</div>
      </div>
      
      <div className="mb-4">
        <h4 className="text-sm font-medium text-[#ffffff] mb-2">
          {selectedNode.data.label}
        </h4>
        <p className="text-xs text-[#7aa6da]">
          {selectedNode.data.componentType?.description}
        </p>
      </div>

      <div className="border-t border-[#7aa6da20] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-medium text-[#7aa6da] uppercase">
            Decorator Configuration
          </h4>
          <button
            onClick={() => {
              const defaults: Record<string, any> = {};
              selectedNode.data.decoratorSchema?.forEach((field: any) => {
                defaults[field.name] = field.defaultValue || '';
              });
              setDecoratorValues(defaults);
              if (selectedNode) {
                onUpdateNode(selectedNode.id, defaults);
              }
            }}
            className="text-xs text-[#6699cc] hover:text-[#82aaff] transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Decorator Syntax Display */}
        <div className="mb-4 p-3 bg-[#002451] rounded border border-[#7aa6da20] font-mono text-xs">
          <div className="text-[#c594c5]">@compute(</div>
          <div className="ml-4 space-y-1">
            {selectedNode.data.computeEnvironment === 'docker' && (
              <div>
                <span className="text-[#7aa6da]">docker_id</span>
                <span className="text-[#bbdaff]">=</span>
                <span className="text-[#99c794]">"{decoratorValues.docker_id || 'my-docker-image'}"</span>,
              </div>
            )}
            {selectedNode.data.computeEnvironment === 'kubernetes' && (
              <>
                <div>
                  <span className="text-[#7aa6da]">namespace</span>
                  <span className="text-[#bbdaff]">=</span>
                  <span className="text-[#99c794]">"{decoratorValues.namespace || 'default'}"</span>,
                </div>
                <div>
                  <span className="text-[#7aa6da]">image</span>
                  <span className="text-[#bbdaff]">=</span>
                  <span className="text-[#99c794]">"{decoratorValues.image || 'python:3.9'}"</span>,
                </div>
              </>
            )}
            {selectedNode.data.computeEnvironment === 'celery' && (
              <>
                <div>
                  <span className="text-[#7aa6da]">celery_pipeline</span>
                  <span className="text-[#bbdaff]">=</span>
                  <span className="text-[#ffcc66]">{decoratorValues.celery_pipeline ? 'True' : 'False'}</span>,
                </div>
                <div>
                  <span className="text-[#7aa6da]">celery_concurrency_threads</span>
                  <span className="text-[#bbdaff]">=</span>
                  <span className="text-[#ffcc66]">{decoratorValues.celery_concurrency_threads || 16}</span>,
                </div>
              </>
            )}
            {selectedNode.data.computeEnvironment === 'batch' && (
              <div>
                <span className="text-[#7aa6da]">batch_pipeline</span>
                <span className="text-[#bbdaff]">=</span>
                <span className="text-[#ffcc66]">{decoratorValues.batch_pipeline ? 'True' : 'False'}</span>,
              </div>
            )}
            <div>
              <span className="text-[#7aa6da]">additional_attributes</span>
              <span className="text-[#bbdaff]">=</span>
              <span className="text-[#99c794]">{decoratorValues.additional_attributes || '{}'}</span>
            </div>
          </div>
          <div className="text-[#c594c5]">)</div>
        </div>
        
        {/* File Import Section */}
        <div className="mb-4 p-3 bg-[#002451] rounded border border-[#7aa6da20]">
          <div className="text-xs font-medium text-[#bbdaff] mb-2">Import from File</div>
          <div className="flex gap-2 mb-2">
            <select
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value as FileFormat)}
              className="flex-1 vscode-input text-xs"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="text">Text (key=value)</option>
              <option value="yaml">YAML</option>
              <option value="xml">XML</option>
            </select>
            <button
              onClick={handleFileLoad}
              className="vscode-button text-xs px-3 py-1"
            >
              Load File
            </button>
          </div>
          {filePath && (
            <div className="text-xs text-[#5a7ca7]">Loaded: {filePath}</div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept=".json,.csv,.txt,.yaml,.yml,.xml"
          />
        </div>
        
        {/* Key Parameters */}
        <div className="space-y-3 mb-4">
          {selectedNode.data.computeEnvironment === 'docker' && (
            <div>
              <label className="block text-xs font-medium text-[#bbdaff] mb-1">Docker ID</label>
              <input
                type="text"
                value={decoratorValues.docker_id || ''}
                onChange={(e) => handleValueChange('docker_id', e.target.value)}
                className="w-full vscode-input text-xs"
                placeholder="my-docker-image:latest"
              />
            </div>
          )}
          
          {selectedNode.data.computeEnvironment === 'kubernetes' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#bbdaff] mb-1">Namespace</label>
                <input
                  type="text"
                  value={decoratorValues.namespace || ''}
                  onChange={(e) => handleValueChange('namespace', e.target.value)}
                  className="w-full vscode-input text-xs"
                  placeholder="default"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#bbdaff] mb-1">Image</label>
                <input
                  type="text"
                  value={decoratorValues.image || ''}
                  onChange={(e) => handleValueChange('image', e.target.value)}
                  className="w-full vscode-input text-xs"
                  placeholder="python:3.9"
                />
              </div>
            </>
          )}
          
          {selectedNode.data.computeEnvironment === 'lambda' && (
            <div>
              <label className="block text-xs font-medium text-[#bbdaff] mb-1">Function Name</label>
              <input
                type="text"
                value={decoratorValues.function_name || ''}
                onChange={(e) => handleValueChange('function_name', e.target.value)}
                className="w-full vscode-input text-xs"
                placeholder="my-lambda-function"
              />
            </div>
          )}
          
          {selectedNode.data.computeEnvironment === 'batch' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#bbdaff] mb-1">
                  <input
                    type="checkbox"
                    checked={decoratorValues.batch_pipeline || false}
                    onChange={(e) => handleValueChange('batch_pipeline', e.target.checked)}
                    className="mr-2"
                  />
                  Batch Pipeline
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#bbdaff] mb-1">Job Definition</label>
                <input
                  type="text"
                  value={decoratorValues.job_definition || ''}
                  onChange={(e) => handleValueChange('job_definition', e.target.value)}
                  className="w-full vscode-input text-xs"
                  placeholder="my-job-definition"
                />
              </div>
            </>
          )}
          
          {selectedNode.data.computeEnvironment === 'celery' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#bbdaff] mb-1">
                  <input
                    type="checkbox"
                    checked={decoratorValues.celery_pipeline || false}
                    onChange={(e) => handleValueChange('celery_pipeline', e.target.checked)}
                    className="mr-2"
                  />
                  Celery Pipeline
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#bbdaff] mb-1">Concurrency Threads</label>
                <input
                  type="number"
                  value={decoratorValues.celery_concurrency_threads || 16}
                  onChange={(e) => handleValueChange('celery_concurrency_threads', parseInt(e.target.value))}
                  className="w-full vscode-input text-xs"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#bbdaff] mb-1">Include Files (JSON Array)</label>
                <textarea
                  value={decoratorValues.celery_include_files || '[]'}
                  onChange={(e) => handleValueChange('celery_include_files', e.target.value)}
                  className="w-full vscode-input text-xs font-mono"
                  rows={2}
                  placeholder='["components/component_1.py", "components/component_2.py"]'
                />
              </div>
            </>
          )}
          
          {/* Pipeline Options */}
          <div className="border-t border-[#7aa6da20] pt-3">
            <h5 className="text-xs font-medium text-[#6699cc] mb-2 uppercase">Pipeline Options</h5>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#bbdaff]">
                <input
                  type="checkbox"
                  checked={decoratorValues.graph_tracing || false}
                  onChange={(e) => handleValueChange('graph_tracing', e.target.checked)}
                  className="mr-2"
                />
                Graph Tracing
              </label>
              <label className="block text-xs font-medium text-[#bbdaff]">
                <input
                  type="checkbox"
                  checked={decoratorValues.clear_graph || false}
                  onChange={(e) => handleValueChange('clear_graph', e.target.checked)}
                  className="mr-2"
                />
                Clear Graph Before Run
              </label>
              <label className="block text-xs font-medium text-[#bbdaff]">
                <input
                  type="checkbox"
                  checked={decoratorValues.multipipeline || false}
                  onChange={(e) => handleValueChange('multipipeline', e.target.checked)}
                  className="mr-2"
                />
                Multi-pipeline Support
              </label>
            </div>
          </div>
          
          {/* Additional Attributes JSON */}
          <div>
            <label className="block text-xs font-medium text-[#bbdaff] mb-1">
              Additional Attributes (JSON)
            </label>
            <textarea
              value={typeof decoratorValues.additional_attributes === 'object' 
                ? JSON.stringify(decoratorValues.additional_attributes, null, 2)
                : decoratorValues.additional_attributes || '{}'}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleValueChange('additional_attributes', parsed);
                } catch {
                  handleValueChange('additional_attributes', e.target.value);
                }
              }}
              className="w-full vscode-input text-xs font-mono"
              rows={4}
              placeholder='{"Classification": "Task", "Username": "User", "Version": "1.1"}'
            />
            <div className="text-xs text-[#5a7ca7] mt-1">JSON format for custom attributes</div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#7aa6da20] pt-4 mt-4">
        <h4 className="text-xs font-medium text-[#7aa6da] mb-2 uppercase">
          Language
        </h4>
        <p className="text-xs text-[#bbdaff]">{selectedNode.data.language || 'python'}</p>
      </div>
    </div>
  );
};