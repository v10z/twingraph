import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workflowService } from '../services/workflowService';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowService.listWorkflows(),
  });

  return (
    <div className="h-full bg-[#002451]">
      {/* Tomorrow Night Blue title bar */}
      <div className="bg-[#003666] border-b border-[#7aa6da20] px-4 py-2">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-medium text-[#bbdaff]">Welcome</h1>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/editor')}
            className="vscode-button text-xs"
          >
            New Workflow
          </button>
        </div>
      </div>

      <main className="p-8 max-w-6xl mx-auto">
        {/* Welcome header */}
        <div className="mb-8">
          <h2 className="text-3xl font-light text-[#ffffff] mb-2">TwinGraph</h2>
          <p className="text-[#7aa6da]">Orchestrate and manage your compute workflows</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-[#bbdaff] mb-4">Start</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/editor')}
              className="glass p-4 text-left hover:bg-[#003666] transition-all cursor-pointer border border-[#7aa6da20] hover:border-[#7aa6da40] rounded-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📝</span>
                <span className="font-medium text-[#ffffff]">New Workflow</span>
              </div>
              <p className="text-xs text-[#7aa6da]">Create a new workflow from scratch</p>
            </button>

            <button
              className="glass p-4 text-left hover:bg-[#003666] transition-all cursor-pointer border border-[#7aa6da20] hover:border-[#7aa6da40] rounded-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📂</span>
                <span className="font-medium text-[#ffffff]">Open Workflow</span>
              </div>
              <p className="text-xs text-[#7aa6da]">Open an existing workflow</p>
            </button>

            <button
              onClick={() => navigate('/executions')}
              className="glass p-4 text-left hover:bg-[#003666] transition-all cursor-pointer border border-[#7aa6da20] hover:border-[#7aa6da40] rounded-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🔍</span>
                <span className="font-medium text-[#ffffff]">View Executions</span>
              </div>
              <p className="text-xs text-[#7aa6da]">Monitor running workflows</p>
            </button>
          </div>
        </div>

        {/* Recent Files */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[#bbdaff]">Recent</h3>
            <button className="text-xs text-[#6699cc] hover:text-[#82aaff] transition-colors">
              More →
            </button>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-8 bg-[#003666] rounded"></div>
                </div>
              ))}
            </div>
          ) : workflows && workflows.length > 0 ? (
            <div className="space-y-1">
              {workflows.slice(0, 5).map((workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => navigate(`/editor/${workflow.id}`)}
                  className="vscode-list-item flex items-center justify-between py-1 px-2 rounded cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📄</span>
                    <span className="text-sm">{workflow.name}</span>
                  </div>
                  <span className="text-xs text-[#5a7ca7]">
                    {new Date(workflow.metadata.modified).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-[#7aa6da] mb-4">No recent workflows</p>
              <button
                onClick={() => navigate('/editor')}
                className="vscode-button text-xs"
              >
                Create Workflow
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};