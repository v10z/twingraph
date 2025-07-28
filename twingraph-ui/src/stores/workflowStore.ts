import { create } from 'zustand';
import { Node, Edge } from 'reactflow';
import { Workflow, ExecutionStatus } from '../types/workflow';
import { workflowService } from '../services/workflowService';

interface WorkflowStore {
  currentWorkflow: Workflow | null;
  executions: ExecutionStatus[];
  isExecuting: boolean;
  
  saveWorkflow: (data: { nodes: Node[]; edges: Edge[] }) => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  executeWorkflow: () => Promise<void>;
  stopExecution: () => Promise<void>;
  
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  updateExecutionStatus: (status: ExecutionStatus) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  currentWorkflow: null,
  executions: [],
  isExecuting: false,
  
  saveWorkflow: async (data) => {
    const workflow: Workflow = {
      id: get().currentWorkflow?.id || `workflow-${Date.now()}`,
      name: get().currentWorkflow?.name || 'Untitled Workflow',
      nodes: data.nodes,
      edges: data.edges,
      metadata: {
        created: get().currentWorkflow?.metadata.created || new Date().toISOString(),
        modified: new Date().toISOString(),
        author: 'current-user',
        version: '1.0.0',
      },
    };
    
    await workflowService.saveWorkflow(workflow);
    set({ currentWorkflow: workflow });
  },
  
  loadWorkflow: async (id) => {
    const workflow = await workflowService.loadWorkflow(id);
    set({ currentWorkflow: workflow });
  },
  
  executeWorkflow: async () => {
    const workflow = get().currentWorkflow;
    if (!workflow) return;
    
    set({ isExecuting: true });
    
    try {
      const executionId = await workflowService.executeWorkflow(workflow);
      
      // Subscribe to execution updates
      workflowService.subscribeToExecution(executionId, (status) => {
        get().updateExecutionStatus(status);
        
        if (['completed', 'failed', 'cancelled'].includes(status.status)) {
          set({ isExecuting: false });
        }
      });
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      set({ isExecuting: false });
    }
  },
  
  stopExecution: async () => {
    const currentExecution = get().executions[0];
    if (currentExecution) {
      await workflowService.cancelExecution(currentExecution.executionId);
    }
  },
  
  setCurrentWorkflow: (workflow) => set({ currentWorkflow: workflow }),
  
  updateExecutionStatus: (status) => {
    set((state) => ({
      executions: [status, ...state.executions.slice(1)],
    }));
  },
}));