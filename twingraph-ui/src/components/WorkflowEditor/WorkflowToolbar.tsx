import React, { useRef, useState } from 'react';
import { Workflow } from '../../types/workflow';
import { useWorkflowStore } from '../../stores/workflowStore';
import {
  SaveIcon,
  OpenIcon,
  RunIcon,
  CloseIcon
} from '../Icons/Icons';

interface WorkflowToolbarProps {
  onSave: () => void;
  onLoad: (workflow: Partial<Workflow>) => void;
  onToggleCodeEditor?: () => void;
  onToggleDecoratorPanel?: () => void;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({ onSave, onLoad, onToggleCodeEditor, onToggleDecoratorPanel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { executeWorkflow, isExecuting, stopExecution } = useWorkflowStore();

  const handleExport = () => {
    onSave();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workflow = JSON.parse(e.target?.result as string);
          onLoad(workflow);
        } catch (error) {
          console.error('Failed to parse workflow file:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-[#003666] rounded px-3 py-1 flex items-center gap-2 border border-[#7aa6da20]">
      <h1 className="text-xs font-medium text-[#bbdaff]">Workflow Editor</h1>
      
      <div className="flex-1" />
      
      <button
        onClick={handleExport}
        className="px-3 py-1.5 text-xs text-[#bbdaff] hover:bg-[#00509d] rounded transition-colors duration-150 flex items-center gap-1.5"
        title="Export Workflow"
      >
        <SaveIcon className="w-4 h-4" />
        <span>Export</span>
      </button>
      
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1.5 text-xs text-[#bbdaff] hover:bg-[#00509d] rounded transition-colors duration-150 flex items-center gap-1.5"
        title="Import Workflow"
      >
        <OpenIcon className="w-4 h-4" />
        <span>Import</span>
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
      
      <div className="w-px h-4 bg-[#7aa6da20]" />
      
      {!isExecuting ? (
        <button
          onClick={() => executeWorkflow()}
          className="px-3 py-1.5 text-xs text-[#99c794] hover:bg-[#00509d] rounded transition-colors duration-150 flex items-center gap-1.5"
          title="Run Workflow"
        >
          <RunIcon className="w-4 h-4" />
          <span>Run</span>
        </button>
      ) : (
        <button
          onClick={() => stopExecution()}
          className="px-3 py-1.5 text-xs text-[#f97b58] hover:bg-[#00509d] rounded transition-colors duration-150 flex items-center gap-1.5"
          title="Stop Execution"
        >
          <CloseIcon className="w-4 h-4" />
          <span>Stop</span>
        </button>
      )}
      
      
      <button
        onClick={onToggleCodeEditor}
        className="px-3 py-1.5 text-xs text-[#bbdaff] hover:bg-[#00509d] rounded transition-colors duration-150 flex items-center gap-1.5"
        title="Toggle Code Editor"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
        <span>Code</span>
      </button>
      
      <button
        onClick={onToggleDecoratorPanel}
        className="px-3 py-1.5 text-xs text-[#bbdaff] hover:bg-[#00509d] rounded transition-colors duration-150 flex items-center gap-1.5"
        title="Toggle Decorator Panel"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        <span>Properties</span>
      </button>
    </div>
  );
};