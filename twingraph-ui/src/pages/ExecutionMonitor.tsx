import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkflowStore } from '../stores/workflowStore';

export const ExecutionMonitor: React.FC = () => {
  const { executionId } = useParams();
  const { executions } = useWorkflowStore();
  
  const currentExecution = executionId 
    ? executions.find(e => e.executionId === executionId)
    : executions[0];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-[#99c794]';
      case 'failed': return 'text-[#f97b58]';
      case 'running': return 'text-[#6699cc]';
      case 'pending': return 'text-[#5a7ca7]';
      default: return 'text-[#5a7ca7]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'failed': return '✗';
      case 'running': return '↻';
      case 'pending': return '○';
      default: return '?';
    }
  };

  if (!currentExecution) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-[#bbdaff] mb-4">
            No Active Executions
          </h2>
          <p className="text-[#7aa6da]">
            Run a workflow to see execution details here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-[#7aa6da20]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-white neon-glow-blue">
            Execution Monitor
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Execution Overview */}
        <div className="glass rounded-lg p-6 mb-6 hover-glow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-[#bbdaff]">
                Execution: {currentExecution.executionId}
              </h2>
              <p className="text-sm text-[#7aa6da] mt-1">
                Workflow: {currentExecution.workflowId}
              </p>
            </div>
            <span className={`text-lg font-semibold ${getStatusColor(currentExecution.status)}`}>
              {getStatusIcon(currentExecution.status)} {currentExecution.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#5a7ca7]">Started:</span>
              <span className="ml-2 text-[#7aa6da]">
                {currentExecution.startTime 
                  ? new Date(currentExecution.startTime).toLocaleString()
                  : '-'}
              </span>
            </div>
            <div>
              <span className="text-[#5a7ca7]">Ended:</span>
              <span className="ml-2 text-[#7aa6da]">
                {currentExecution.endTime 
                  ? new Date(currentExecution.endTime).toLocaleString()
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Node Status */}
        <div className="glass rounded-lg">
          <div className="px-6 py-4 border-b border-[#7aa6da20]">
            <h3 className="text-lg font-semibold text-[#bbdaff]">Node Execution Status</h3>
          </div>
          <div className="p-6">
            {Object.entries(currentExecution.nodes).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(currentExecution.nodes).map(([nodeId, nodeStatus]) => (
                  <div key={nodeId} className="glass-light rounded-lg p-4 hover-lift">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-white">{nodeId}</h4>
                      <span className={`text-sm ${getStatusColor(nodeStatus.status)}`}>
                        {getStatusIcon(nodeStatus.status)} {nodeStatus.status}
                      </span>
                    </div>
                    
                    {nodeStatus.error && (
                      <div className="bg-[#f97b5820] border border-[#f97b5840] rounded p-2 mt-2">
                        <p className="text-sm text-[#f97b58]">{nodeStatus.error}</p>
                      </div>
                    )}
                    
                    {nodeStatus.output && (
                      <div className="bg-[#00173320] rounded p-2 mt-2">
                        <p className="text-xs text-[#5a7ca7] mb-1">Output:</p>
                        <pre className="text-sm overflow-x-auto text-[#7aa6da] font-mono">
                          {JSON.stringify(nodeStatus.output, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {nodeStatus.logs && nodeStatus.logs.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-[#5a7ca7] mb-1">Logs:</p>
                        <div className="bg-[#001733] text-[#7aa6da] rounded p-2 text-xs font-mono border border-[#7aa6da20]">
                          {nodeStatus.logs.map((log, i) => (
                            <div key={i}>{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#7aa6da] text-center py-8">
                No node execution data available
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};