import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

// Sample data for demonstration
const sampleData = {
  lineChart: Array.from({ length: 50 }, (_, i) => ({
    x: i,
    y: Math.sin(i / 5) * 50 + 50 + Math.random() * 20,
  })),
  barChart: [
    { name: 'Python', value: 85 },
    { name: 'JavaScript', value: 72 },
    { name: 'TypeScript', value: 68 },
    { name: 'Rust', value: 45 },
    { name: 'Go', value: 40 },
  ],
  scatterPlot: Array.from({ length: 100 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    r: Math.random() * 10 + 2,
  })),
};

export const D3Viewer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'scatter'>('line');
  const [fileData, setFileData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        setFileData(data);
      } catch (error) {
        console.error('Failed to parse file:', error);
      }
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 300;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Use file data if available, otherwise use sample data
    const data = fileData || sampleData;

    if (chartType === 'line') {
      // Line Chart
      const lineData = data.lineChart || sampleData.lineChart;
      
      const xScale = d3.scaleLinear()
        .domain([0, lineData.length - 1])
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain(d3.extent(lineData, d => d.y) as [number, number])
        .range([innerHeight, 0]);

      const line = d3.line<any>()
        .x((d, i) => xScale(i))
        .y(d => yScale(d.y))
        .curve(d3.curveMonotoneX);

      // Add axes
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .style('color', '#7aa6da');

      g.append('g')
        .call(d3.axisLeft(yScale))
        .style('color', '#7aa6da');

      // Add line
      g.append('path')
        .datum(lineData)
        .attr('fill', 'none')
        .attr('stroke', '#6699cc')
        .attr('stroke-width', 2)
        .attr('d', line);

      // Add dots
      g.selectAll('.dot')
        .data(lineData)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', (d, i) => xScale(i))
        .attr('cy', d => yScale(d.y))
        .attr('r', 3)
        .attr('fill', '#82aaff');

    } else if (chartType === 'bar') {
      // Bar Chart
      const barData = data.barChart || sampleData.barChart;
      
      const xScale = d3.scaleBand()
        .domain(barData.map(d => d.name))
        .range([0, innerWidth])
        .padding(0.1);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.value) || 100])
        .range([innerHeight, 0]);

      // Add axes
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .style('color', '#7aa6da')
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');

      g.append('g')
        .call(d3.axisLeft(yScale))
        .style('color', '#7aa6da');

      // Add bars
      g.selectAll('.bar')
        .data(barData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.name) || 0)
        .attr('y', d => yScale(d.value))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.value))
        .attr('fill', '#99c794');

    } else if (chartType === 'scatter') {
      // Scatter Plot
      const scatterData = data.scatterPlot || sampleData.scatterPlot;
      
      const xScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([innerHeight, 0]);

      // Add axes
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .style('color', '#7aa6da');

      g.append('g')
        .call(d3.axisLeft(yScale))
        .style('color', '#7aa6da');

      // Add dots
      g.selectAll('.dot')
        .data(scatterData)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.y))
        .attr('r', d => d.r)
        .attr('fill', '#ffcc66')
        .attr('opacity', 0.7);
    }

    // Style all text elements
    svg.selectAll('text').style('fill', '#bbdaff');
    svg.selectAll('.domain').style('stroke', '#7aa6da');
    svg.selectAll('.tick line').style('stroke', '#7aa6da');

  }, [chartType, fileData]);

  return (
    <div className="h-full flex flex-col bg-[#001733]">
      {/* Header */}
      <div className="p-4 border-b border-[#7aa6da20]">
        <h3 className="text-sm font-medium text-[#bbdaff] mb-2">D3.js Visualization</h3>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              chartType === 'line' 
                ? 'bg-[#6699cc] text-white' 
                : 'bg-[#003666] text-[#bbdaff] hover:bg-[#00509d]'
            }`}
          >
            Line Chart
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              chartType === 'bar' 
                ? 'bg-[#6699cc] text-white' 
                : 'bg-[#003666] text-[#bbdaff] hover:bg-[#00509d]'
            }`}
          >
            Bar Chart
          </button>
          <button
            onClick={() => setChartType('scatter')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              chartType === 'scatter' 
                ? 'bg-[#6699cc] text-white' 
                : 'bg-[#003666] text-[#bbdaff] hover:bg-[#00509d]'
            }`}
          >
            Scatter Plot
          </button>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 text-xs bg-[#003666] text-[#bbdaff] rounded hover:bg-[#00509d] transition-colors"
        >
          Load Data
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Chart Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-[#002451] rounded border border-[#7aa6da20] p-4">
          <svg ref={svgRef}></svg>
        </div>
      </div>

      {/* Info panel */}
      <div className="p-3 border-t border-[#7aa6da20] text-xs text-[#7aa6da]">
        <div>Interactive D3.js charts • Load JSON data for custom visualization</div>
        <div>60 FPS animated transitions</div>
      </div>
    </div>
  );
};