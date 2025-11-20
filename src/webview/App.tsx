import React, { useEffect, useState, useMemo } from 'react';
import GraphView from './components/GraphView';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import DetailsPanel from './components/DetailsPanel';
import { GraphData, ViewMode } from './types';

// VSCode API 类型
interface VSCodeAPI {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
}

// 应用属性
interface AppProps {
  vscode: VSCodeAPI;
}

// 应用组件
const App: React.FC<AppProps> = ({ vscode }) => {
  // 状态
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  
  // 处理消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'graphData':
          setGraphData(message.data);
          setLoading(false);
          break;
        case 'error':
          setError(message.message);
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ type: 'getGraphData' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [vscode]);

  // 过滤数据 (Focus Mode)
  const filteredData = useMemo(() => {
    if (!graphData) return null;
    if (!isFocusMode || !selectedNode) return graphData;

    // 找出相关节点 (1度分隔)
    const relatedNodeIds = new Set<string>();
    relatedNodeIds.add(selectedNode);

    graphData.links.forEach(link => {
      if (link.source === selectedNode) relatedNodeIds.add(link.target);
      if (link.target === selectedNode) relatedNodeIds.add(link.source);
    });

    const nodes = graphData.nodes.filter(node => relatedNodeIds.has(node.id));
    const links = graphData.links.filter(link => 
      relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target)
    );

    return {
      ...graphData,
      nodes,
      links
    };
  }, [graphData, isFocusMode, selectedNode]);

  // 处理刷新
  const handleRefresh = () => {
    setLoading(true);
    vscode.postMessage({ type: 'refresh' });
  };
  
  // 处理导出
  const handleExport = (format: 'json' | 'csv') => {
    vscode.postMessage({ type: 'export', format });
  };
  
  // 处理视图模式切换
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };
  
  // 处理节点选择
  const handleNodeSelect = (nodeId: string) => {
    setSelectedNode(nodeId);
  };
  
  // 处理文件打开
  const handleOpenFile = (filePath: string) => {
    vscode.postMessage({ type: 'openFile', filePath });
  };
  
  // 渲染加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading graph data...</p>
        </div>
      </div>
    );
  }
  
  // 渲染错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900 text-red-500">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">Error</p>
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // 渲染无数据状态
  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">No References Found</h2>
          <p className="text-gray-600">No code references were found in the current workspace.</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleRefresh}
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }
  
  // 渲染主界面
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* 工具栏 */}
      <Toolbar 
        viewMode={viewMode} 
        onViewModeChange={handleViewModeChange} 
        onRefresh={handleRefresh} 
        onExport={handleExport}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* 侧边栏 */}
        <Sidebar 
          graphData={filteredData} 
          selectedNode={selectedNode} 
          onNodeSelect={handleNodeSelect} 
          onOpenFile={handleOpenFile} 
        />
        
        {/* 图表视图 */}
        <div className="flex-1 overflow-hidden relative">
          <GraphView 
            data={filteredData} 
            viewMode={viewMode} 
            selectedNode={selectedNode} 
            onNodeSelect={handleNodeSelect} 
          />
          
          {/* 详情面板 */}
          {graphData && (
            <DetailsPanel
              graphData={graphData}
              selectedNodeId={selectedNode}
              onClose={() => setSelectedNode(null)}
              onNodeSelect={handleNodeSelect}
              onOpenFile={handleOpenFile}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App; 
