import React from 'react';

export const SimpleDragTest: React.FC = () => {
  const handleDragStart = (e: React.DragEvent) => {
    console.log('Drag started');
    e.dataTransfer.setData('test', 'Hello World');
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('Drag over');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('test');
    console.log('Dropped:', data);
  };

  return (
    <div className="p-4 bg-[#001733] text-[#bbdaff]">
      <div
        draggable
        onDragStart={handleDragStart}
        className="p-2 bg-[#003666] rounded cursor-move mb-4"
      >
        Drag me
      </div>
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="p-8 bg-[#002451] border-2 border-dashed border-[#7aa6da] rounded"
      >
        Drop here
      </div>
    </div>
  );
};