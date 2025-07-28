import React, { useState } from 'react';
import { Pipeline } from '../WorkflowEditor/PipelineManager';
import { codeTemplates } from '../WorkflowEditor/CodeTemplates';
import {
  ComponentIcon,
  LocalComputeIcon,
  DockerIcon,
  KubernetesIcon,
  LambdaIcon,
  BatchIcon,
  CeleryIcon,
  SlurmIcon,
  SSHIcon,
  ConditionalIcon,
  LoopIcon,
  PlusIcon,
  CloseIcon
} from '../Icons/Icons';

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface EnhancedUnifiedSidebarProps {
  pipelines: Pipeline[];
  activePipelineId: string;
  onAddPipeline: () => void;
  onSelectPipeline: (id: string) => void;
  onDeletePipeline: (id: string) => void;
  onUpdatePipeline: (id: string, updates: Partial<Pipeline>) => void;
  showFullGraphVisualization: boolean;
  onToggleFullGraphVisualization: () => void;
}

const components = [
  {
    id: 'local-component',
    name: 'Local Component',
    environment: 'local',
    description: 'Execute on local machine',
    icon: <LocalComputeIcon className="w-5 h-5" />,
  },
  {
    id: 'docker-component',
    name: 'Docker Component',
    environment: 'docker',
    description: 'Execute in Docker container',
    icon: <DockerIcon className="w-5 h-5" />,
  },
  {
    id: 'kubernetes-component',
    name: 'Kubernetes Component',
    environment: 'kubernetes',
    description: 'Execute in K8s pod',
    icon: <KubernetesIcon className="w-5 h-5" />,
  },
  {
    id: 'lambda-component',
    name: 'Lambda Component',
    environment: 'lambda',
    description: 'Serverless execution',
    icon: <LambdaIcon className="w-5 h-5" />,
  },
  {
    id: 'batch-component',
    name: 'Batch Component',
    environment: 'batch',
    description: 'Batch compute jobs',
    icon: <BatchIcon className="w-5 h-5" />,
  },
  {
    id: 'celery-component',
    name: 'Celery Component',
    environment: 'celery',
    description: 'Distributed task queue',
    icon: <CeleryIcon className="w-5 h-5" />,
  },
  {
    id: 'slurm-component',
    name: 'SLURM Component',
    environment: 'slurm',
    description: 'HPC job scheduling with SLURM',
    icon: <SlurmIcon className="w-5 h-5" />,
  },
  {
    id: 'ssh-component',
    name: 'SSH Remote Component',
    environment: 'ssh',
    description: 'Remote execution via SSH',
    icon: <SSHIcon className="w-5 h-5" />,
  },
];

const controlFlowElements = [
  {
    id: 'conditional-if',
    name: 'If Condition',
    type: 'conditional',
    description: 'Conditional branching logic',
    icon: <ConditionalIcon className="w-5 h-5" />,
  },
  {
    id: 'for-loop',
    name: 'For Loop',
    type: 'loop',
    loopType: 'for',
    description: 'Iterate over collection',
    icon: <LoopIcon className="w-5 h-5" />,
  },
  {
    id: 'while-loop',
    name: 'While Loop',
    type: 'loop',
    loopType: 'while',
    description: 'Conditional iteration',
    icon: <LoopIcon className="w-5 h-5" />,
  },
  {
    id: 'foreach-loop',
    name: 'ForEach Loop',
    type: 'loop',
    loopType: 'forEach',
    description: 'Functional iteration',
    icon: <LoopIcon className="w-5 h-5" />,
  },
  {
    id: 'range-loop',
    name: 'Range Loop',
    type: 'loop',
    loopType: 'range',
    description: 'Numeric range iteration',
    icon: <LoopIcon className="w-5 h-5" />,
  },
];

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
  'slurm': [
    { name: 'partition', type: 'string', defaultValue: 'compute', description: 'SLURM partition name' },
    { name: 'nodes', type: 'number', defaultValue: 1, description: 'Number of nodes' },
    { name: 'ntasks', type: 'number', defaultValue: 1, description: 'Number of tasks' },
    { name: 'cpus_per_task', type: 'number', defaultValue: 1, description: 'CPUs per task' },
    { name: 'time', type: 'string', defaultValue: '01:00:00', description: 'Job time limit' },
    { name: 'memory', type: 'string', defaultValue: '4GB', description: 'Memory per node' },
    { name: 'job_name', type: 'string', defaultValue: 'twingraph-job', description: 'SLURM job name' },
    { name: 'output_file', type: 'string', defaultValue: 'slurm-%j.out', description: 'Output file pattern' },
    { name: 'error_file', type: 'string', defaultValue: 'slurm-%j.err', description: 'Error file pattern' },
    { name: 'account', type: 'string', defaultValue: '', description: 'SLURM account (optional)' },
    { name: 'qos', type: 'string', defaultValue: '', description: 'Quality of Service (optional)' },
    { name: 'graph_tracing', type: 'boolean', defaultValue: true, description: 'Enable graph tracing', category: 'pipeline' },
  ],
  'ssh': [
    { name: 'hostname', type: 'string', defaultValue: '', description: 'Remote hostname or IP' },
    { name: 'port', type: 'number', defaultValue: 22, description: 'SSH port' },
    { name: 'username', type: 'string', defaultValue: '', description: 'SSH username' },
    { name: 'key_file', type: 'string', defaultValue: '~/.ssh/id_rsa', description: 'SSH private key file' },
    { name: 'remote_workdir', type: 'string', defaultValue: '/tmp/twingraph', description: 'Remote working directory' },
    { name: 'timeout', type: 'number', defaultValue: 300, description: 'SSH timeout (seconds)' },
    { name: 'python_path', type: 'string', defaultValue: 'python3', description: 'Python executable on remote' },
    { name: 'transfer_files', type: 'boolean', defaultValue: true, description: 'Transfer input files' },
    { name: 'cleanup_remote', type: 'boolean', defaultValue: true, description: 'Cleanup remote files after execution' },
    { name: 'graph_tracing', type: 'boolean', defaultValue: true, description: 'Enable graph tracing', category: 'pipeline' },
  ],
  'pipeline': [
    { name: 'clear_graph', type: 'boolean', defaultValue: false, description: 'Clear graph before run' },
    { name: 'multipipeline', type: 'boolean', defaultValue: false, description: 'Multi-pipeline support' },
    { name: 'graph_config', type: 'json', defaultValue: '{"graph_endpoint": "ws://localhost:8182"}', description: 'Graph database config' },
    { name: 'additional_attributes', type: 'json', defaultValue: '{"Classification": "Task", "Username": "User", "Version": "1.1"}', description: 'Additional metadata' },
  ],
};


export const EnhancedUnifiedSidebar: React.FC<EnhancedUnifiedSidebarProps> = ({
  pipelines,
  activePipelineId,
  onAddPipeline,
  onSelectPipeline,
  onDeletePipeline,
  onUpdatePipeline
}) => {
  const [activeSection, setActiveSection] = useState<string>('pipelines');
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [editPipelineName, setEditPipelineName] = useState('');

  const sections: SidebarSection[] = [
    {
      id: 'pipelines',
      label: 'Pipelines',
      icon: <ComponentIcon />
    },
    {
      id: 'compute',
      label: 'Components',
      icon: <ComponentIcon />
    },
    {
      id: 'control',
      label: 'Control Flow',
      icon: <ConditionalIcon />
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: <ComponentIcon />
    }
  ];

  const handleStartEditPipeline = (pipeline: Pipeline) => {
    setEditingPipelineId(pipeline.id);
    setEditPipelineName(pipeline.name);
  };

  const handleSaveEditPipeline = (id: string) => {
    if (editPipelineName.trim()) {
      onUpdatePipeline(id, { name: editPipelineName.trim() });
    }
    setEditingPipelineId(null);
  };

  const onDragStartComponent = (event: React.DragEvent, component: any) => {
    // Get default inputs/outputs based on component type
    const getDefaultInputsOutputs = (environment: string) => {
      const defaults: Record<string, { inputs: any[], outputs: any[], code: string, language: 'python' | 'bash' }> = {
        local: {
          inputs: [{ name: 'input_data', type: 'object', description: 'Input data to process' }],
          outputs: [{ name: 'result', type: 'object', description: 'Processed result' }],
          code: 'from twingraph import component\nfrom collections import namedtuple\n\n@component()\ndef process(input_data):\n    # Your processing code here\n    result = input_data\n    \n    # Return as namedtuple\n    outputs = namedtuple(\'outputs\', [\'result\'])\n    return outputs(result)',
          language: 'python'
        },
        docker: {
          inputs: [{ name: 'data', type: 'object' }, { name: 'config', type: 'object' }],
          outputs: [{ name: 'output', type: 'object' }],
          code: 'from twingraph import component\nfrom collections import namedtuple\n\n@component(docker_id="my-image:latest")\ndef process(data, config):\n    # Docker container processing\n    output = data\n    \n    outputs = namedtuple(\'outputs\', [\'output\'])\n    return outputs(output)',
          language: 'python'
        },
        kubernetes: {
          inputs: [{ name: 'job_data', type: 'object' }],
          outputs: [{ name: 'result', type: 'object' }],
          code: 'from twingraph import component\nfrom collections import namedtuple\n\n@component(kubernetes_task=True, namespace="default")\ndef process(job_data):\n    # Kubernetes job processing\n    result = job_data\n    \n    outputs = namedtuple(\'outputs\', [\'result\'])\n    return outputs(result)',
          language: 'python'
        },
        lambda: {
          inputs: [{ name: 'event', type: 'object' }, { name: 'context', type: 'object' }],
          outputs: [{ name: 'response', type: 'object' }],
          code: 'from twingraph import component\nfrom collections import namedtuple\n\n@component(lambda_task=True)\ndef lambda_handler(event, context):\n    # AWS Lambda function\n    response = {"statusCode": 200, "body": event}\n    \n    outputs = namedtuple(\'outputs\', [\'response\'])\n    return outputs(response)',
          language: 'python'
        },
        batch: {
          inputs: [{ name: 'batch_data', type: 'array' }],
          outputs: [{ name: 'processed_data', type: 'array' }],
          code: 'from twingraph import component\nfrom collections import namedtuple\n\n@component(batch_task=True)\ndef process_batch(batch_data):\n    # AWS Batch processing\n    processed_data = [item for item in batch_data]\n    \n    outputs = namedtuple(\'outputs\', [\'processed_data\'])\n    return outputs(processed_data)',
          language: 'python'
        },
        celery: {
          inputs: [{ name: 'task_data', type: 'object' }],
          outputs: [{ name: 'task_result', type: 'object' }],
          code: 'from twingraph import component\nfrom collections import namedtuple\n\n@component(celery_task=True, queue="default")\ndef celery_task(task_data):\n    # Celery distributed task\n    task_result = task_data\n    \n    outputs = namedtuple(\'outputs\', [\'task_result\'])\n    return outputs(task_result)',
          language: 'python'
        },
        slurm: {
          inputs: [{ name: 'job_data', type: 'object' }, { name: 'input_files', type: 'array' }],
          outputs: [{ name: 'job_result', type: 'object' }, { name: 'output_files', type: 'array' }],
          code: '#!/bin/bash\n#SBATCH --job-name=twingraph-job\n#SBATCH --nodes=1\n#SBATCH --ntasks=1\n#SBATCH --time=01:00:00\n#SBATCH --output=slurm-%j.out\n\n# SLURM job script\necho "Starting SLURM job on $(hostname)"\npython3 -c "print(\'Job completed successfully\')"\necho "Job finished"',
          language: 'bash'
        },
        ssh: {
          inputs: [{ name: 'remote_data', type: 'object' }, { name: 'files_to_transfer', type: 'array' }],
          outputs: [{ name: 'remote_result', type: 'object' }, { name: 'downloaded_files', type: 'array' }],
          code: 'from twingraph import component\nfrom collections import namedtuple\n\n@component(ssh_task=True, hostname="remote-server")\ndef remote_execute(remote_data, files_to_transfer):\n    # SSH remote execution\n    import subprocess\n    result = subprocess.run(["echo", "Remote execution completed"], capture_output=True, text=True)\n    remote_result = {"stdout": result.stdout, "stderr": result.stderr, "returncode": result.returncode}\n    \n    outputs = namedtuple(\'outputs\', [\'remote_result\', \'downloaded_files\'])\n    return outputs(remote_result, [])',
          language: 'python'
        },
      };
      return defaults[environment] || defaults.local;
    };

    const defaultData = getDefaultInputsOutputs(component.environment);
    
    const nodeData = {
      type: 'component',
      label: component.name,
      computeEnvironment: component.environment,
      inputs: defaultData.inputs,
      outputs: defaultData.outputs,
      code: defaultData.code,
      language: defaultData.language,
      decoratorInputs: {},
      decoratorSchema: [
        ...(decoratorSchemas[component.environment] || []),
        ...(decoratorSchemas['pipeline'] || [])
      ],
    };
    
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragStartTemplate = (event: React.DragEvent, template: any) => {
    // Templates use a different data transfer type so they can only be dropped in nested editors
    event.dataTransfer.setData('application/template', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragStartControlFlow = (event: React.DragEvent, element: any) => {
    const getControlFlowDefaults = (type: string, loopType?: string) => {
      if (type === 'conditional') {
        return {
          inputs: [{ name: 'input_data', type: 'object', description: 'Data to evaluate' }],
          outputs: [{ name: 'result', type: 'object', description: 'Conditional result' }],
          condition: 'input_data > 0',
          conditionType: 'if'
        };
      } else if (type === 'loop') {
        const baseInputs = [{ name: 'items', type: 'array', description: 'Items to iterate' }];
        const baseOutputs = [
          { name: 'current_item', type: 'object', description: 'Current iteration item' },
          { name: 'iteration_results', type: 'array', description: 'Results from each iteration' },
          { name: 'final_result', type: 'object', description: 'Final loop result' }
        ];
        
        switch (loopType) {
          case 'for':
            return {
              inputs: baseInputs,
              outputs: baseOutputs,
              iterable: 'items',
              variable: 'item',
              loopType: 'for'
            };
          case 'while':
            return {
              inputs: [{ name: 'initial_data', type: 'object', description: 'Initial data' }],
              outputs: baseOutputs,
              condition: 'condition_check(data)',
              variable: 'data',
              loopType: 'while'
            };
          case 'forEach':
            return {
              inputs: baseInputs,
              outputs: baseOutputs,
              iterable: 'items',
              variable: 'item',
              loopType: 'forEach'
            };
          case 'range':
            return {
              inputs: [{ name: 'max_count', type: 'number', description: 'Maximum iterations' }],
              outputs: baseOutputs,
              iterable: 'range',
              variable: 'i',
              maxIterations: 10,
              loopType: 'range'
            };
          default:
            return {
              inputs: baseInputs,
              outputs: baseOutputs,
              iterable: 'items',
              variable: 'item',
              loopType: 'for'
            };
        }
      }
      return { inputs: [], outputs: [], condition: '', loopType: 'for' };
    };

    const defaults = getControlFlowDefaults(element.type, element.loopType);
    
    const nodeData = {
      type: element.type,
      label: element.name,
      ...defaults,
      decoratorInputs: {},
      decoratorSchema: [],
    };
    
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };


  return (
    <div className="w-64 bg-[#001733] h-full flex flex-col border-r border-[#7aa6da20]">
      {/* Section Tabs - 2x2 Grid */}
      <div className="grid grid-cols-2 grid-rows-2 bg-[#002451] border-b border-[#7aa6da20]">
        {sections.map((section, index) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`
              px-4 py-4 flex flex-col items-center justify-center gap-1 transition-all
              ${activeSection === section.id 
                ? 'bg-[#003666] text-white shadow-inner' 
                : 'text-[#7aa6da] hover:bg-[#003666] hover:text-[#bbdaff]'
              }
              ${index % 2 === 0 ? 'border-r border-[#7aa6da20]' : ''}
              ${index < 2 ? 'border-b border-[#7aa6da20]' : ''}
            `}
          >
            <div className="text-xl">{section.icon}</div>
            <span className="text-xs font-medium">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Pipelines Section */}
        {activeSection === 'pipelines' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#bbdaff] uppercase">
                Pipelines
              </h3>
              <button
                onClick={onAddPipeline}
                className="p-1 text-[#7aa6da] hover:text-white hover:bg-[#003666] rounded transition-all"
                title="Add Pipeline"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {pipelines.map((pipeline) => (
                <div
                  key={pipeline.id}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-all duration-150
                    ${activePipelineId === pipeline.id 
                      ? 'bg-[#00509d] border-2 border-[#6699cc] shadow-lg' 
                      : 'bg-[#002451] border border-[#7aa6da20] hover:bg-[#003666] hover:border-[#6699cc]'
                    }
                  `}
                  onClick={() => onSelectPipeline(pipeline.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: pipeline.color }}
                      />
                      
                      {editingPipelineId === pipeline.id ? (
                        <input
                          type="text"
                          value={editPipelineName}
                          onChange={(e) => setEditPipelineName(e.target.value)}
                          onBlur={() => handleSaveEditPipeline(pipeline.id)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEditPipeline(pipeline.id);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-transparent text-sm text-white outline-none border-b border-[#6699cc] flex-1"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="text-sm text-white font-medium flex-1"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleStartEditPipeline(pipeline);
                          }}
                        >
                          {pipeline.name}
                        </span>
                      )}
                    </div>

                    {pipelines.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePipeline(pipeline.id);
                        }}
                        className="text-[#f97b58] hover:text-[#ff9999] transition-colors p-1"
                      >
                        <CloseIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  <div className="text-xs text-[#7aa6da] mt-1">
                    {pipeline.nodes.length} nodes, {pipeline.edges.length} edges
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-[#5a7ca7] mt-4">
              Double-click to rename • Multi-pipeline: {pipelines.length > 1 ? 'ON' : 'OFF'}
            </div>
          </div>
        )}

        {/* Components Section */}
        {activeSection === 'compute' && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[#bbdaff] uppercase mb-3">
              Drag to Canvas
            </h3>
            {components.map((component) => (
              <div
                key={component.id}
                className="p-3 rounded-lg cursor-move transition-all duration-150 
                         border border-[#7aa6da20] hover:bg-[#003666] hover:border-[#6699cc] 
                         bg-[#002451] group"
                draggable
                onDragStart={(event) => onDragStartComponent(event, component)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-[#7aa6da] group-hover:text-white transition-colors">
                    {component.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-white">{component.name}</div>
                    <div className="text-xs text-[#7aa6da]">{component.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Control Flow Section */}
        {activeSection === 'control' && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[#bbdaff] uppercase mb-3">
              Control Flow Elements
            </h3>
            {controlFlowElements.map((element) => (
              <div
                key={element.id}
                className="p-3 rounded-lg cursor-move transition-all duration-150 
                         border border-[#7aa6da20] hover:bg-[#003666] hover:border-[#6699cc] 
                         bg-[#002451] group"
                draggable
                onDragStart={(event) => onDragStartControlFlow(event, element)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-[#7aa6da] group-hover:text-white transition-colors">
                    {element.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-white">{element.name}</div>
                    <div className="text-xs text-[#7aa6da]">{element.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Templates Section */}
        {activeSection === 'templates' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[#bbdaff] uppercase mb-3">
              Code Templates
            </h3>
            
            {/* Group templates by category */}
            {['basic', 'ai', 'data', 'hpc', 'integration'].map((category) => {
              const categoryTemplates = codeTemplates.filter(t => t.category === category);
              if (categoryTemplates.length === 0) return null;
              
              const categoryIcons: Record<string, string> = {
                basic: '🔧',
                ai: '🤖',
                data: '📊',
                hpc: '🖥️',
                integration: '🔄'
              };
              
              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-medium text-[#7aa6da] flex items-center gap-1">
                    <span>{categoryIcons[category]}</span>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </h4>
                  {categoryTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="p-3 rounded-lg cursor-move transition-all duration-150 
                               border border-[#7aa6da20] hover:bg-[#003666] hover:border-[#6699cc] 
                               bg-[#002451] group"
                      draggable
                      onDragStart={(event) => onDragStartTemplate(event, template)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-lg group-hover:scale-110 transition-transform">
                          {template.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-white">{template.name}</div>
                          <div className="text-xs text-[#7aa6da] line-clamp-2">{template.description}</div>
                          <div className="text-xs text-[#5a7ca7] mt-1">
                            {template.language === 'python' ? '🐍 Python' : '🖥️ Bash'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            
            <div className="text-xs text-[#5a7ca7] mt-4">
              Drag templates into component editors (click "Show Editor" first)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};