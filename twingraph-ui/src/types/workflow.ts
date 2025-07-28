export interface Node {
  id: string;
  type: 'component' | 'input' | 'output';
  position: { x: number; y: number };
  data: {
    label: string;
    componentType: ComponentType;
    code?: string;
    language?: SupportedLanguage;
    inputs?: PortDefinition[];
    outputs?: PortDefinition[];
    config?: NodeConfig;
    decoratorInputs?: Record<string, any>;
    decoratorSchema?: Array<{name: string, type: string, defaultValue?: any, description?: string, options?: string[], category?: string}>;
  };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: 'default' | 'animated';
  data?: {
    label?: string;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  metadata: {
    created: string;
    modified: string;
    author: string;
    version: string;
    tags?: string[];
  };
}

export type SupportedLanguage = 'python' | 'javascript' | 'typescript' | 'bash' | 'cpp' | 'rust';

export interface ComponentType {
  id: string;
  name: string;
  category: 'data' | 'compute' | 'io' | 'control' | 'custom';
  icon?: string;
  description?: string;
  defaultCode?: string;
  supportedLanguages: SupportedLanguage[];
}

export interface PortDefinition {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  default?: any;
  description?: string;
}

export interface NodeConfig {
  compute?: {
    platform: 'local' | 'docker' | 'kubernetes' | 'lambda' | 'batch';
    resources?: {
      cpu?: string;
      memory?: string;
      gpu?: string;
    };
  };
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    backoff: 'linear' | 'exponential';
  };
  timeout?: number;
  environment?: Record<string, string>;
}

export interface ExecutionStatus {
  workflowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  nodes: Record<string, NodeExecutionStatus>;
}

export interface NodeExecutionStatus {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  output?: any;
  error?: string;
  logs?: string[];
}