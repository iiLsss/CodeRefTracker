import React, { useEffect, useRef } from 'react';
import { GraphData, ViewMode } from '../types';
import NetworkGraph from './graphs/NetworkGraph';
import TreeGraph from './graphs/TreeGraph';
import MatrixView from './graphs/MatrixView';
import HeatmapView from './graphs/HeatmapView';

interface GraphViewProps {
  data: GraphData | null;
  viewMode: ViewMode;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ 
  data, 
  viewMode, 
  selectedNode, 
  onNodeSelect 
}) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  // 根据视图模式渲染不同的图表
  const renderGraph = () => {
    switch (viewMode) {
      case 'network':
        return (
          <NetworkGraph 
            data={data} 
            selectedNode={selectedNode}
            onNodeSelect={onNodeSelect}
          />
        );
      case 'tree':
        return (
          <TreeGraph 
            data={data} 
            selectedNode={selectedNode}
            onNodeSelect={onNodeSelect}
          />
        );
      case 'matrix':
        return (
          <MatrixView 
            data={data} 
            selectedNode={selectedNode}
            onNodeSelect={onNodeSelect}
          />
        );
      case 'heatmap':
        return (
          <HeatmapView 
            data={data} 
            selectedNode={selectedNode}
            onNodeSelect={onNodeSelect}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">Unknown view mode</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden bg-white dark:bg-dark-bg shadow-sm">
      {renderGraph()}
    </div>
  );
};

export default GraphView; 
