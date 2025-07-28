import React from 'react';

// Compute Units - organized by execution environment
const computeUnits = [
  {
    id: 'local-compute',
    name: 'Local Compute',
    environment: 'local',
    description: 'Execute on local machine',
    icon: '💻',
  },
  {
    id: 'docker-compute',
    name: 'Docker Container',
    environment: 'docker',
    description: 'Execute in Docker container',
    icon: '🐳',
  },
  {
    id: 'kubernetes-compute',
    name: 'Kubernetes Pod',
    environment: 'kubernetes',
    description: 'Execute in K8s pod',
    icon: '☸️',
  },
  {
    id: 'lambda-compute',
    name: 'AWS Lambda',
    environment: 'lambda',
    description: 'Serverless execution',
    icon: 'λ',
  },
  {
    id: 'batch-compute',
    name: 'AWS Batch',
    environment: 'batch',
    description: 'Batch compute jobs',
    icon: '🔲',
  },
  {
    id: 'celery-compute',
    name: 'Celery Worker',
    environment: 'celery',
    description: 'Distributed task queue',
    icon: '🌿',
  },
];

// Subcomponents that can be added to compute units
const subComponents = [
  // I/O Operations
  { id: 'file-read', name: 'File Read', type: 'io', description: 'Read from file' },
  { id: 'file-write', name: 'File Write', type: 'io', description: 'Write to file' },
  { id: 'api-call', name: 'API Call', type: 'io', description: 'HTTP/REST API call' },
  { id: 'database-query', name: 'Database Query', type: 'io', description: 'SQL query' },
  
  // Compute Operations
  { id: 'python-script', name: 'Python Script', type: 'compute', description: 'Execute Python code' },
  { id: 'bash-script', name: 'Bash Script', type: 'compute', description: 'Execute shell commands' },
  { id: 'data-transform', name: 'Data Transform', type: 'compute', description: 'Transform data' },
];

// Control flow options (for edges)
const controlFlowTypes = [
  { id: 'sequential', name: 'Sequential', description: 'Execute in order' },
  { id: 'conditional', name: 'Conditional', description: 'If-then-else branching' },
  { id: 'loop', name: 'Loop', description: 'Iterate over items' },
  { id: 'parallel', name: 'Parallel', description: 'Execute simultaneously' },
];

// Decorator schemas for each environment
const decoratorSchemas: Record<string, Array<{name: string, type: string, defaultValue?: any, description?: string, options?: string[], category?: string}>> = {
  'local': [
    { name: 'workdir', type: 'string', defaultValue: '.', description: 'Working directory' },
    { name: 'env_vars', type: 'json', defaultValue: '{}', description: 'Environment variables' },
    { name: 'graph_tracing', type: 'boolean', defaultValue: true, description: 'Enable graph tracing', category: 'pipeline' },
  ],
  'docker': [
    { name: 'docker_image', type: 'string', defaultValue: 'python:3.9', description: 'Docker image' },
    { name: 'docker_id', type: 'string', defaultValue: '', description: 'Container ID' },
    { name: 'memory_limit', type: 'string', defaultValue: '512MB', description: 'Memory limit' },
    { name: 'cpu_limit', type: 'number', defaultValue: 1, description: 'CPU cores' },
    { name: 'graph_tracing', type: 'boolean', defaultValue: true, description: 'Enable graph tracing', category: 'pipeline' },
  ],
  'kubernetes': [
    { name: 'namespace', type: 'string', defaultValue: 'default', description: 'K8s namespace' },
    { name: 'image', type: 'string', defaultValue: 'python:3.9', description: 'Container image' },
    { name: 'replicas', type: 'number', defaultValue: 1, description: 'Pod replicas' },
    { name: 'memory_request', type: 'string', defaultValue: '256Mi', description: 'Memory request' },
    { name: 'cpu_request', type: 'string', defaultValue: '250m', description: 'CPU request' },
    { name: 'kubernetes_pipeline', type: 'boolean', defaultValue: true, description: 'K8s pipeline mode' },
    { name: 'graph_tracing', type: 'boolean', defaultValue: true, description: 'Enable graph tracing', category: 'pipeline' },
  ],
  'lambda': [
    { name: 'function_name', type: 'string', defaultValue: '', description: 'Lambda function name' },
    { name: 'timeout', type: 'number', defaultValue: 300, description: 'Timeout (seconds)' },
    { name: 'memory_size', type: 'number', defaultValue: 512, description: 'Memory (MB)' },
    { name: 'graph_tracing', type: 'boolean', defaultValue: true, description: 'Enable graph tracing', category: 'pipeline' },
  ],
  'batch': [
    { name: 'job_definition', type: 'string', defaultValue: '', description: 'Job definition name' },
    { name: 'job_queue', type: 'string', defaultValue: '', description: 'Job queue name' },
    { name: 'vcpus', type: 'number', defaultValue: 1, description: 'vCPU count' },
    { name: 'memory', type: 'number', defaultValue: 2048, description: 'Memory (MB)' },
    { name: 'graph_tracing', type: 'boolean', defaultValue: true, description: 'Enable graph tracing', category: 'pipeline' },
  ],
  'celery': [
    { name: 'queue', type: 'string', defaultValue: 'default', description: 'Task queue name' },
    { name: 'celery_pipeline', type: 'boolean', defaultValue: true, description: 'Celery pipeline mode' },
    { name: 'celery_include_files', type: 'json', defaultValue: '[]', description: 'Include files (array)' },
    { name: 'max_retries', type: 'number', defaultValue: 3, description: 'Max retry attempts' },
    { name: 'graph_tracing', type: 'boolean', defaultValue: true, description: 'Enable graph tracing', category: 'pipeline' },
  ],
  // Common pipeline flags
  'pipeline': [
    { name: 'clear_graph', type: 'boolean', defaultValue: false, description: 'Clear graph before run' },
    { name: 'multipipeline', type: 'boolean', defaultValue: false, description: 'Multi-pipeline support' },
    { name: 'graph_config', type: 'json', defaultValue: '{"graph_endpoint": "ws://localhost:8182"}', description: 'Graph database config' },
    { name: 'additional_attributes', type: 'json', defaultValue: '{"Classification": "Task", "Username": "TwinGraph-User", "Version": "1.1"}', description: 'Additional metadata' },
  ],
};

export const ComponentSidebar: React.FC = () => {
  const onDragStartComputeUnit = (event: React.DragEvent, unit: any) => {
    const nodeData = {
      type: 'computeUnit',
      label: unit.name,
      computeEnvironment: unit.environment,
      subComponents: [],
      decoratorInputs: {},
      decoratorSchema: [
        ...(decoratorSchemas[unit.environment] || []),
        ...(decoratorSchemas['pipeline'] || [])
      ],
    };
    
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-[#001733] border-r border-[#7aa6da20] overflow-y-auto">
      {/* Compute Units Section */}
      <div className="p-4 border-b border-[#7aa6da20]">
        <h2 className="text-sm font-medium mb-3 text-[#bbdaff] uppercase">Compute Units</h2>
        <div className="space-y-2">
          {computeUnits.map((unit) => (
            <div
              key={unit.id}
              className="p-3 rounded cursor-move transition-all duration-150 border border-[#7aa6da20] hover:bg-[#003666] hover:border-[#6699cc] bg-[#002451]"
              draggable
              onDragStart={(event) => onDragStartComputeUnit(event, unit)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{unit.icon}</span>
                <div>
                  <div className="font-medium text-sm text-[#ffffff]">{unit.name}</div>
                  <div className="text-xs text-[#7aa6da]">{unit.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Subcomponents Section */}
      <div className="p-4 border-b border-[#7aa6da20]">
        <h3 className="text-xs font-medium mb-3 text-[#7aa6da] uppercase">Components</h3>
        <div className="text-xs text-[#5a7ca7] mb-2">
          Drop these onto compute units
        </div>
        <div className="space-y-1">
          {subComponents.map((component) => (
            <div
              key={component.id}
              className="p-2 rounded cursor-move transition-all duration-150 border border-transparent hover:bg-[#003666] hover:border-[#7aa6da20]"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('subComponent', JSON.stringify(component));
                event.dataTransfer.effectAllowed = 'copy';
              }}
            >
              <div className="text-sm text-[#bbdaff]">{component.name}</div>
              <div className="text-xs text-[#5a7ca7]">{component.description}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Control Flow Section */}
      <div className="p-4">
        <h3 className="text-xs font-medium mb-3 text-[#7aa6da] uppercase">Control Flow</h3>
        <div className="text-xs text-[#5a7ca7] mb-2">
          Click edges to set control flow
        </div>
        <div className="space-y-1">
          {controlFlowTypes.map((flow) => (
            <div
              key={flow.id}
              className="p-2 rounded border border-[#7aa6da20] bg-[#002451]"
            >
              <div className="text-sm text-[#bbdaff]">{flow.name}</div>
              <div className="text-xs text-[#5a7ca7]">{flow.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};