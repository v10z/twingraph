import React, { useState } from 'react';
import { ModernGraphVisualization } from '../GraphVisualization/ModernGraphVisualization';
import {
  ComponentIcon,
  GraphIcon,
  VisualizationIcon,
  LocalComputeIcon,
  DockerIcon,
  KubernetesIcon,
  LambdaIcon,
  BatchIcon,
  CeleryIcon,
  GenAIIcon,
  HPCIcon,
  CFDIcon,
  FEMIcon
} from '../Icons/Icons';

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: any[];
}

const computeUnits = [
  {
    id: 'local-compute',
    name: 'Local Compute',
    environment: 'local',
    description: 'Execute on local machine',
    icon: <LocalComputeIcon className="w-5 h-5" />,
  },
  {
    id: 'docker-compute',
    name: 'Docker Container',
    environment: 'docker',
    description: 'Execute in Docker container',
    icon: <DockerIcon className="w-5 h-5" />,
  },
  {
    id: 'kubernetes-compute',
    name: 'Kubernetes Pod',
    environment: 'kubernetes',
    description: 'Execute in K8s pod',
    icon: <KubernetesIcon className="w-5 h-5" />,
  },
  {
    id: 'lambda-compute',
    name: 'AWS Lambda',
    environment: 'lambda',
    description: 'Serverless execution',
    icon: <LambdaIcon className="w-5 h-5" />,
  },
  {
    id: 'batch-compute',
    name: 'AWS Batch',
    environment: 'batch',
    description: 'Batch compute jobs',
    icon: <BatchIcon className="w-5 h-5" />,
  },
  {
    id: 'celery-compute',
    name: 'Celery Worker',
    environment: 'celery',
    description: 'Distributed task queue',
    icon: <CeleryIcon className="w-5 h-5" />,
  },
];

const workflowTemplates = [
  {
    id: 'genai-rag',
    name: 'RAG Pipeline',
    category: 'genai',
    description: 'Retrieval Augmented Generation',
    icon: <GenAIIcon className="w-5 h-5" />,
  },
  {
    id: 'genai-agent',
    name: 'AI Agent Workflow',
    category: 'genai',
    description: 'Multi-agent AI system',
    icon: <GenAIIcon className="w-5 h-5" />,
  },
  {
    id: 'hpc-mpi',
    name: 'MPI Cluster',
    category: 'hpc',
    description: 'Message Passing Interface',
    icon: <HPCIcon className="w-5 h-5" />,
  },
  {
    id: 'cfd-openfoam',
    name: 'OpenFOAM Pipeline',
    category: 'cfd',
    description: 'CFD simulation workflow',
    icon: <CFDIcon className="w-5 h-5" />,
  },
  {
    id: 'fem-ansys',
    name: 'ANSYS Workflow',
    category: 'fem',
    description: 'Finite element analysis',
    icon: <FEMIcon className="w-5 h-5" />,
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
  'pipeline': [
    { name: 'clear_graph', type: 'boolean', defaultValue: false, description: 'Clear graph before run' },
    { name: 'multipipeline', type: 'boolean', defaultValue: false, description: 'Multi-pipeline support' },
    { name: 'graph_config', type: 'json', defaultValue: '{"graph_endpoint": "ws://localhost:8182"}', description: 'Graph database config' },
    { name: 'additional_attributes', type: 'json', defaultValue: '{"Classification": "Task", "Username": "User", "Version": "1.1"}', description: 'Additional metadata' },
  ],
};

export const UnifiedSidebar: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('compute');

  const sections: SidebarSection[] = [
    {
      id: 'compute',
      label: 'Compute Units',
      icon: <ComponentIcon />,
      items: computeUnits
    },
    {
      id: 'templates',
      label: 'Workflow Templates',
      icon: <GraphIcon />,
      items: workflowTemplates
    },
    {
      id: 'visualization',
      label: 'Visualization',
      icon: <VisualizationIcon />,
      items: []
    }
  ];

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

  const onDragStartTemplate = (event: React.DragEvent, template: any) => {
    const nodeData = {
      type: 'template',
      templateId: template.id,
      label: template.name,
      category: template.category,
      description: template.description,
    };
    
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-[#001733] h-full flex flex-col border-r border-[#7aa6da20]">
      {/* Section Tabs */}
      <div className="flex bg-[#002451] border-b border-[#7aa6da20]">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`
              flex-1 px-3 py-3 flex items-center justify-center gap-2 transition-all
              ${activeSection === section.id 
                ? 'bg-[#003666] text-white border-b-2 border-[#6699cc]' 
                : 'text-[#7aa6da] hover:bg-[#003666] hover:text-[#bbdaff]'
              }
            `}
            title={section.label}
          >
            {section.icon}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSection === 'compute' && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[#bbdaff] uppercase mb-3">
              Drag to Canvas
            </h3>
            {computeUnits.map((unit) => (
              <div
                key={unit.id}
                className="p-3 rounded-lg cursor-move transition-all duration-150 
                         border border-[#7aa6da20] hover:bg-[#003666] hover:border-[#6699cc] 
                         bg-[#002451] group"
                draggable
                onDragStart={(event) => onDragStartComputeUnit(event, unit)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-[#7aa6da] group-hover:text-white transition-colors">
                    {unit.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-white">{unit.name}</div>
                    <div className="text-xs text-[#7aa6da]">{unit.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'templates' && (
          <div className="space-y-4">
            {/* GenAI Templates */}
            <div>
              <h3 className="text-sm font-medium text-[#bbdaff] uppercase mb-2">
                GenAI Workflows
              </h3>
              <div className="space-y-2">
                {workflowTemplates.filter(t => t.category === 'genai').map((template) => (
                  <div
                    key={template.id}
                    className="p-3 rounded-lg cursor-move transition-all duration-150 
                             border border-[#7aa6da20] hover:bg-[#003666] hover:border-[#6699cc] 
                             bg-[#002451] group"
                    draggable
                    onDragStart={(event) => onDragStartTemplate(event, template)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-[#7aa6da] group-hover:text-white transition-colors">
                        {template.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-white">{template.name}</div>
                        <div className="text-xs text-[#7aa6da]">{template.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HPC/CFD/FEM Templates */}
            <div>
              <h3 className="text-sm font-medium text-[#bbdaff] uppercase mb-2">
                HPC/Scientific Computing
              </h3>
              <div className="space-y-2">
                {workflowTemplates.filter(t => ['hpc', 'cfd', 'fem'].includes(t.category)).map((template) => (
                  <div
                    key={template.id}
                    className="p-3 rounded-lg cursor-move transition-all duration-150 
                             border border-[#7aa6da20] hover:bg-[#003666] hover:border-[#6699cc] 
                             bg-[#002451] group"
                    draggable
                    onDragStart={(event) => onDragStartTemplate(event, template)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-[#7aa6da] group-hover:text-white transition-colors">
                        {template.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-white">{template.name}</div>
                        <div className="text-xs text-[#7aa6da]">{template.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'visualization' && (
          <div className="h-full flex flex-col">
            <h3 className="text-sm font-medium text-[#bbdaff] uppercase mb-3">
              Graph Visualization
            </h3>
            <div className="flex-1">
              <ModernGraphVisualization embedded={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};