import React, { useState, useCallback } from 'react';
import { GraphData } from '../../types';

// 导入优化后的图表组件
import OptimizedNetworkGraph from './OptimizedNetworkGraph';
import OptimizedTreeGraph from './OptimizedTreeGraph';
import OptimizedMatrixGraph from './OptimizedMatrixGraph';

// 导入原有的D3.js组件作为备选
import NetworkGraph from './NetworkGraph';
import TreeGraph from './TreeGraph';
import MatrixView from './MatrixView';
import HeatmapView from './HeatmapView';

interface GraphManagerProps {
  data: GraphData;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
  initialViewMode?: string;
}

type ViewMode = 'network' | 'tree' | 'matrix' | 'heatmap';
type GraphEngine = 'optimized' | 'original';

const GraphManager: React.FC<GraphManagerProps> = ({
  data,
  selectedNode,
  onNodeSelect,
  initialViewMode = 'network'
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode as ViewMode);
  const [graphEngine, setGraphEngine] = useState<GraphEngine>('optimized');
  const [isLoading, setIsLoading] = useState(false);

  // 切换视图模式
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setIsLoading(true);
    setTimeout(() => {
      setViewMode(mode);
      setIsLoading(false);
    }, 100);
  }, []);

  // 切换图表引擎
  const handleEngineChange = useCallback((engine: GraphEngine) => {
    setIsLoading(true);
    setTimeout(() => {
      setGraphEngine(engine);
      setIsLoading(false);
    }, 100);
  }, []);

  // 渲染对应的图表组件
  const renderGraph = useCallback(() => {
    const props = { data, selectedNode, onNodeSelect };

    if (graphEngine === 'optimized') {
      switch (viewMode) {
        case 'network':
          return <OptimizedNetworkGraph {...props} />;
        case 'tree':
          return <OptimizedTreeGraph {...props} />;
        case 'matrix':
          return <OptimizedMatrixGraph {...props} />;
        default:
          return <OptimizedNetworkGraph {...props} />;
      }
    } else {
      // 使用原有的D3.js组件
      switch (viewMode) {
        case 'network':
          return <NetworkGraph {...props} />;
        case 'tree':
          return <TreeGraph {...props} />;
        case 'matrix':
          return <MatrixView {...props} />;
        case 'heatmap':
          return <HeatmapView {...props} />;
        default:
          return <NetworkGraph {...props} />;
      }
    }
  }, [viewMode, graphEngine, data, selectedNode, onNodeSelect]);

  // 获取性能信息
  const getPerformanceInfo = useCallback(() => {
    const nodeCount = data?.nodes?.length || 0;
    const linkCount = data?.links?.length || 0;
    
    let recommendation = '';
    if (nodeCount > 100) {
      recommendation = '建议使用优化版本以获得更好的性能';
    } else if (nodeCount > 50) {
      recommendation = '中等规模数据，两种版本都可以';
    } else {
      recommendation = '小规模数据，任何版本都可以流畅运行';
    }

    return {
      nodeCount,
      linkCount,
      recommendation
    };
  }, [data]);

  const perfInfo = getPerformanceInfo();

  return (
    <div className="w-full h-full flex flex-col">
      {/* 控制栏 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 视图模式选择 */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">视图模式:</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => handleViewModeChange('network')}
                className={`px-3 py-1 text-sm transition-colors ${
                  viewMode === 'network'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                网络图
              </button>
              <button
                onClick={() => handleViewModeChange('tree')}
                className={`px-3 py-1 text-sm border-l border-gray-300 transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                树形图
              </button>
              <button
                onClick={() => handleViewModeChange('matrix')}
                className={`px-3 py-1 text-sm border-l border-gray-300 transition-colors ${
                  viewMode === 'matrix'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                矩阵图
              </button>
            </div>
          </div>

          {/* 图表引擎选择 */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">引擎:</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => handleEngineChange('optimized')}
                className={`px-3 py-1 text-sm transition-colors ${
                  graphEngine === 'optimized'
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                优化版
              </button>
              <button
                onClick={() => handleEngineChange('original')}
                className={`px-3 py-1 text-sm border-l border-gray-300 transition-colors ${
                  graphEngine === 'original'
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                原版 D3.js
              </button>
            </div>
          </div>

          {/* 性能信息 */}
          <div className="text-xs text-gray-500">
            <div>节点: {perfInfo.nodeCount} | 链接: {perfInfo.linkCount}</div>
            <div className="mt-1">{perfInfo.recommendation}</div>
          </div>
        </div>

        {/* 引擎对比信息 */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-semibold text-green-600 mb-1">优化版本优势</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 更好的性能和响应速度</li>
                <li>• 更少的代码复杂度</li>
                <li>• 更好的TypeScript支持</li>
                <li>• 专门针对引用关系优化</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600 mb-1">D3.js版本特点</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 更多的自定义选项</li>
                <li>• 完整的D3.js生态系统</li>
                <li>• 更细粒度的控制</li>
                <li>• 适合复杂的可视化需求</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-gray-600">加载中...</span>
            </div>
          </div>
        ) : (
          renderGraph()
        )}
      </div>

      {/* 状态栏 */}
      <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>
            当前: {viewMode === 'network' ? '网络图' : viewMode === 'tree' ? '树形图' : viewMode === 'matrix' ? '矩阵图' : '热力图'} 
            ({graphEngine === 'optimized' ? '优化版' : 'D3.js版'})
          </div>
          <div>
            {selectedNode ? `选中: ${selectedNode}` : '未选中节点'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphManager; 
