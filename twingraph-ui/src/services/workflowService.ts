import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Workflow, ExecutionStatus } from '../types/workflow';

class WorkflowService {
  private apiUrl = '/api';
  private socket: Socket | null = null;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io('/ws', {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to workflow server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from workflow server');
    });
  }

  async saveWorkflow(workflow: Workflow): Promise<void> {
    await axios.post(`${this.apiUrl}/workflows/${workflow.id}`, workflow);
  }

  async loadWorkflow(id: string): Promise<Workflow> {
    const response = await axios.get(`${this.apiUrl}/workflows/${id}`);
    return response.data;
  }

  async listWorkflows(): Promise<Workflow[]> {
    const response = await axios.get(`${this.apiUrl}/workflows`);
    return response.data;
  }

  async executeWorkflow(workflow: Workflow): Promise<string> {
    const response = await axios.post(`${this.apiUrl}/executions`, {
      workflowId: workflow.id,
      workflow,
    });
    return response.data.executionId;
  }

  async cancelExecution(executionId: string): Promise<void> {
    await axios.post(`${this.apiUrl}/executions/${executionId}/cancel`);
  }

  subscribeToExecution(executionId: string, callback: (status: ExecutionStatus) => void) {
    if (!this.socket) return;

    this.socket.emit('subscribe', { executionId });
    
    this.socket.on(`execution:${executionId}`, (status: ExecutionStatus) => {
      callback(status);
    });
  }

  unsubscribeFromExecution(executionId: string) {
    if (!this.socket) return;

    this.socket.emit('unsubscribe', { executionId });
    this.socket.off(`execution:${executionId}`);
  }
}

export const workflowService = new WorkflowService();