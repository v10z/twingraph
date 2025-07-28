import React from 'react';

interface NodeInspectorProps {
  node: {
    id: string;
    label: string;
    properties?: Record<string, any>;
  };
  onClose: () => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({ node, onClose }) => {
  const formatValue = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatPropertyName = (name: string): string => {
    // Convert camelCase to Title Case
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const isJsonString = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  const renderPropertyValue = (value: any) => {
    const stringValue = formatValue(value);
    
    // Check if it's a JSON string
    if (typeof value === 'string' && isJsonString(value)) {
      try {
        const parsed = JSON.parse(value);
        return (
          <pre className="bg-[#001733] p-2 rounded text-xs overflow-x-auto text-[#bbdaff] border border-[#003666]">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        return <span>{stringValue}</span>;
      }
    }
    
    // Check if it's source code
    if (typeof value === 'string' && (value.includes('def ') || value.includes('function'))) {
      return (
        <pre className="bg-[#000d1a] text-[#bbdaff] p-2 rounded text-xs overflow-x-auto border border-[#003666]">
          <code>{value}</code>
        </pre>
      );
    }
    
    // Check if it's a long string
    if (typeof value === 'string' && value.length > 100) {
      return (
        <div className="bg-[#001733] p-2 rounded text-sm text-[#bbdaff] border border-[#003666]">
          {value}
        </div>
      );
    }
    
    return <span>{stringValue}</span>;
  };

  // Group properties by category
  const groupedProperties = Object.entries(node.properties || {}).reduce((acc, [key, value]) => {
    let category = 'General';
    
    if (['Inputs', 'Outputs', 'Output'].includes(key)) {
      category = 'Data';
    } else if (['SourceCode', 'Signature', 'ArgumentSpecifications'].includes(key)) {
      category = 'Code';
    } else if (['ExecutionTime', 'StartTime', 'EndTime', 'Timestamp'].includes(key)) {
      category = 'Timing';
    } else if (['Platform', 'DockerImage', 'Status', 'Success'].includes(key)) {
      category = 'Execution';
    } else if (['ParentHashes', 'Hash', 'ExecutionID'].includes(key)) {
      category = 'Graph';
    } else if (['Error', 'ErrorMessage', 'Traceback'].includes(key)) {
      category = 'Errors';
    }
    
    if (!acc[category]) acc[category] = [];
    acc[category].push({ key, value });
    
    return acc;
  }, {} as Record<string, Array<{ key: string; value: any }>>);

  return (
    <div className="h-full overflow-y-auto bg-[#001733]">
      {/* Header */}
      <div className="sticky top-0 bg-[#002451] border-b border-[#003666] p-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#bbdaff]">Node Properties</h3>
        <button
          onClick={onClose}
          className="text-[#7aa6da] hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Node Info */}
      <div className="p-4 border-b border-[#003666]">
        <div className="mb-2">
          <span className="text-sm font-medium text-[#7aa6da]">Node ID</span>
          <p className="text-sm font-mono text-[#bbdaff]">{node.id}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-[#7aa6da]">Label</span>
          <p className="text-sm font-semibold text-[#bbdaff]">{node.label}</p>
        </div>
      </div>
      
      {/* Properties */}
      <div className="p-4">
        {Object.entries(groupedProperties).map(([category, properties]) => (
          <div key={category} className="mb-6">
            <h4 className="text-sm font-semibold text-[#7aa6da] mb-2 flex items-center">
              {getCategoryIcon(category)}
              <span className="ml-2">{category}</span>
            </h4>
            <div className="space-y-3">
              {properties.map(({ key, value }) => (
                <div key={key} className="border-l-2 border-[#003666] pl-3">
                  <div className="text-xs font-medium text-[#7aa6da] mb-1">
                    {formatPropertyName(key)}
                  </div>
                  <div className="text-sm text-[#bbdaff]">
                    {renderPropertyValue(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const getCategoryIcon = (category: string): JSX.Element => {
  const iconClass = "w-4 h-4 text-[#7aa6da]";
  
  switch (category) {
    case 'Data':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'Code':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    case 'Timing':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'Execution':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    case 'Graph':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'Errors':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};