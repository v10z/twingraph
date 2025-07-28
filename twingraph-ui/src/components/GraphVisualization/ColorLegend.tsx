import React from 'react';

interface ColorLegendProps {
  colorScheme: 'platform' | 'status' | 'type' | 'community';
  showStatusIndicators?: boolean;
}

export const ColorLegend: React.FC<ColorLegendProps> = ({ colorScheme, showStatusIndicators = true }) => {
  const platformColors = [
    { name: 'Local', color: '#99c794' },
    { name: 'Docker', color: '#6699cc' },
    { name: 'Kubernetes', color: '#82aaff' },
    { name: 'Lambda', color: '#ffcc66' },
    { name: 'Batch', color: '#f97b58' },
    { name: 'Celery', color: '#c594c5' },
    { name: 'Slurm', color: '#ff6b6b' },
    { name: 'SSH', color: '#4ecdc4' }
  ];

  const statusColors = [
    { name: 'Pending', color: '#5a7ca7' },
    { name: 'Running', color: '#ffcc66' },
    { name: 'Completed', color: '#99c794' },
    { name: 'Failed', color: '#f97b58' }
  ];

  const typeColors = [
    { name: 'Component', color: '#2196F3' },
    { name: 'Pipeline', color: '#4CAF50' },
    { name: 'Data', color: '#FF9800' },
    { name: 'Model', color: '#9C27B0' },
    { name: 'Service', color: '#F44336' }
  ];

  const statusBorderColors = [
    { name: 'Pending', color: '#3a5a7a' },
    { name: 'Running', color: '#ff9900' },
    { name: 'Completed', color: '#5fb14f' },
    { name: 'Failed', color: '#e74c3c' }
  ];

  const getColorItems = () => {
    switch (colorScheme) {
      case 'platform':
        return platformColors;
      case 'status':
        return statusColors;
      case 'type':
        return typeColors;
      default:
        return [];
    }
  };

  const colorItems = getColorItems();

  return (
    <div className="bg-[#002451] border border-[#7aa6da20] rounded-lg p-3 space-y-3">
      {/* Main color scheme */}
      <div>
        <h4 className="text-xs font-medium text-[#7aa6da] mb-2">
          {colorScheme.charAt(0).toUpperCase() + colorScheme.slice(1)} Colors
        </h4>
        <div className="space-y-1">
          {colorItems.map(item => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-sm" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-[#bbdaff]">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status indicators (border colors) */}
      {showStatusIndicators && colorScheme !== 'status' && (
        <div>
          <h4 className="text-xs font-medium text-[#7aa6da] mb-2">
            Status Indicators (Border)
          </h4>
          <div className="space-y-1">
            {statusBorderColors.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-sm border-2" 
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: item.color 
                  }}
                />
                <span className="text-xs text-[#bbdaff]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend note */}
      {showStatusIndicators && colorScheme !== 'status' && (
        <div className="text-xs text-[#5a7ca7] italic">
          Node fill color shows {colorScheme}, border shows execution status
        </div>
      )}
    </div>
  );
};