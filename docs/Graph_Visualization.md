# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

# Enhanced Graph Visualization

TwinGraph v2 includes a significantly enhanced graph visualization system inspired by the best features of Gremlin visualizers, providing powerful tools for exploring and understanding workflow execution graphs.

## Features

### 1. Advanced Visualization Controls

The enhanced visualizer provides multiple layout algorithms and visualization options:

- **Hierarchical Layout**: Ideal for workflow visualization with clear parent-child relationships
- **Force-Directed Layout**: Self-organizing layout that reveals natural clusters
- **Circular Layout**: Shows cyclic dependencies and relationships
- **Grid Layout**: Organized display for large graphs

### 2. Interactive Gremlin Query Interface

Execute Gremlin queries directly from the visualization interface:

```groovy
// Find all failed components
g.V().has('status', 'failed')

// Find execution path
g.V().has('Type', 'PipelineStart')
  .repeat(out())
  .until(has('Type', 'PipelineEnd'))
  .path()

// Find high-degree nodes
g.V().where(both().count().is(gt(5)))

// Group by platform
g.V().group().by('Platform')
```

### 3. Real-time Updates

- **1-second refresh** during workflow execution
- **WebSocket integration** for instant status updates
- **Progressive rendering** for large graphs
- **Smooth animations** for node status changes

### 4. Advanced Search & Filtering

- **Full-text search** across all node properties
- **Property-based filtering**
- **Regex support** for complex queries
- **Connected component highlighting**

### 5. Customizable Visual Encoding

#### Color Schemes
- **By Platform**: Docker (blue), Kubernetes (orange), Lambda (purple), etc.
- **By Status**: Running (blue), Completed (green), Failed (red)
- **By Type**: Component, Pipeline, Data, Model
- **By Community**: Automatic community detection coloring

#### Node Sizing
- **Uniform**: All nodes same size
- **By Degree**: Size based on number of connections
- **By PageRank**: Size based on importance in graph

### 6. Export Capabilities

Export your graph visualization in multiple formats:

- **PNG Image**: High-resolution graph snapshot
- **JSON Data**: Complete graph structure with properties
- **Gremlin Script**: Generate importable Gremlin commands

### 7. Graph Statistics

Real-time graph metrics:
- Node and edge counts
- Connected components
- Average degree
- Graph density
- Clustering coefficient
- Diameter
- Modularity

## Usage Guide

### Opening the Visualizer

1. Click the **"Show Graph"** button in the workflow toolbar
2. Or use keyboard shortcut `Ctrl+G`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Focus search box |
| `Ctrl+R` | Fit graph to view |
| `Escape` | Deselect node/edge |
| `Space` | Pause/resume physics |
| `F` | Toggle fullscreen |

### Query Examples

#### Find Components by Time
```groovy
g.V().has('Timestamp', between('2024-01-01', '2024-12-31'))
```

#### Trace Execution Path
```groovy
g.V('component-id').repeat(out()).times(3).path()
```

#### Find Bottlenecks
```groovy
g.V().has('ExecutionTime', gt(5000)).order().by('ExecutionTime', desc)
```

#### Analyze Dependencies
```groovy
g.V().has('Name', 'critical-component')
  .both()
  .dedup()
  .values('Name')
```

### Visual Analysis Techniques

#### 1. Identifying Performance Issues
- Switch to **"By Status"** coloring
- Look for red (failed) nodes
- Check execution times in node properties

#### 2. Understanding Data Flow
- Use **Hierarchical layout**
- Follow edges from left to right
- Inspect edge labels for data types

#### 3. Finding Critical Paths
- Switch node sizing to **"By PageRank"**
- Larger nodes indicate critical components
- Use Gremlin queries to trace paths

#### 4. Cluster Analysis
- Switch to **Force-directed layout**
- Enable physics simulation
- Natural clusters will form

## Advanced Features

### Custom Property Display

The node inspector categorizes properties:
- **Data**: Inputs, outputs, results
- **Code**: Source code, signatures
- **Timing**: Execution times, timestamps
- **Execution**: Platform, status, configuration
- **Graph**: Hashes, IDs, relationships
- **Errors**: Error messages, stack traces

### Edge Analysis

Click on edges to inspect:
- Connection details
- Data flow properties
- Execution dependencies
- Custom metadata

### Graph Manipulation

- **Drag nodes** to reposition
- **Zoom** with mouse wheel
- **Pan** by dragging background
- **Select multiple** with Ctrl+Click

## Performance Optimization

For large graphs (>1000 nodes):

1. **Disable physics** for better performance
2. **Use filtering** to focus on relevant nodes
3. **Hide edge labels** to reduce clutter
4. **Enable node clustering** for aggregation

## Integration with Workflows

The visualizer integrates seamlessly with:
- **Workflow execution monitoring**
- **Component debugging**
- **Performance profiling**
- **Dependency analysis**

## Troubleshooting

### Graph Not Loading
- Check WebSocket connection
- Verify TinkerGraph server is running
- Check browser console for errors

### Slow Performance
- Reduce visible nodes with filtering
- Disable physics simulation
- Use simplified layout (grid)

### Missing Nodes
- Check "Show Orphan Nodes" setting
- Verify Gremlin query syntax
- Ensure proper graph connectivity

## API Reference

### GraphService Methods

```typescript
// Execute Gremlin query
await graphService.executeGremlinQuery(query: string)

// Get execution graph
await graphService.getExecutionGraph(executionId: string)

// Search components
await graphService.searchComponents({
  name?: string,
  platform?: string,
  startTime?: string,
  endTime?: string
})
```

### WebSocket Events

```javascript
// Subscribe to graph updates
ws.on('graph:update', (data) => {
  // Handle graph update
});

// Subscribe to node status
ws.on('node:status', (nodeId, status) => {
  // Handle status change
});
```

## Best Practices

1. **Start with hierarchical layout** for workflow understanding
2. **Use search** before complex Gremlin queries
3. **Export important views** as PNG for documentation
4. **Save useful queries** in the query panel
5. **Monitor graph statistics** for performance insights

## Future Enhancements

- 3D graph visualization
- Time-based animation
- Collaborative viewing
- AI-powered layout suggestions
- Advanced graph algorithms (centrality, pathfinding)