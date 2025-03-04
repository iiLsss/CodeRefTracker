import React, { useEffect, useState } from 'react';
import GraphView from './components/GraphView';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
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
  const [viewMode, setViewMode] = useState<ViewMode>('network');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
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
    
    // 添加消息监听器
    window.addEventListener('message', handleMessage);
    
    // 请求图表数据
    vscode.postMessage({ type: 'getGraphData' });
    
    // 清理
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [vscode]);
  
  // 处理刷新
  const handleRefresh = () => {
    setLoading(true);
    vscode.postMessage({ type: 'refreshData' });
  };
  
  // 处理导出
  const handleExport = (format: 'json' | 'csv') => {
    vscode.postMessage({ type: 'exportData', format });
  };
  
  // 处理视图模式切换
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };
  
  // 处理节点选择
  const handleNodeSelect = (nodeId: string) => {
    setSelectedNode(nodeId);
    
    // 获取节点信息
    const node = graphData?.nodes.find(n => n.id === nodeId);
    if (node) {
      // 显示节点详情
      console.log('Selected node:', node);
    }
  };
  
  // 处理文件打开
  const handleOpenFile = (filePath: string) => {
    vscode.postMessage({ type: 'openFile', filePath });
  };
  
  // 渲染加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading code references...</p>
        </div>
      </div>
    );
  }
  
  // 渲染错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-bold mb-2">Error</h2>
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
    <div className="flex flex-col h-screen">
      {/* 工具栏 */}
      <Toolbar 
        viewMode={viewMode} 
        onViewModeChange={handleViewModeChange} 
        onRefresh={handleRefresh} 
        onExport={handleExport} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar 
          graphData={graphData} 
          selectedNode={selectedNode} 
          onNodeSelect={handleNodeSelect} 
          onOpenFile={handleOpenFile} 
        />
        
        {/* 图表视图 */}
        <div className="flex-1 overflow-hidden">
          <GraphView 
            data={graphData} 
            viewMode={viewMode} 
            selectedNode={selectedNode} 
            onNodeSelect={handleNodeSelect} 
          />
        </div>
      </div>
    </div>
  );
};

export default App; 
