import React from 'react';
import NetworkGraph from './graphs/NetworkGraph';
import TreeGraph from './graphs/TreeGraph';
import MatrixView from './graphs/MatrixView';
import HeatmapView from './graphs/HeatmapView';
import { GraphData, ViewMode } from '../types';

// 图表视图属性
interface GraphViewProps {
  data: GraphData | null;
  viewMode: ViewMode;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
}

// 图表视图组件
const GraphView: React.FC<GraphViewProps> = ({ 
  data, 
  viewMode, 
  selectedNode, 
  onNodeSelect 
}) => {
  // 如果没有数据，显示空状态
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // 根据视图模式渲染不同的图表
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
          <p className="text-gray-500">Unknown view mode: {viewMode}</p>
        </div>
      );
  }
};

export default GraphView; 
