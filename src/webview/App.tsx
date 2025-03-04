import React, { useState, useEffect } from 'react';
import GraphView from './components/GraphView';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import { GraphData, ViewMode } from './types';

// 获取 VSCode API
const vscode = acquireVsCodeApi();

const App: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('network');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  useEffect(() => {
    // 监听来自 extension 的消息
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.type) {
        case 'graphData':
          setGraphData(message.data);
          setLoading(false);
          break;
        case 'updateNode':
          // 处理节点更新
          if (graphData) {
            // 更新逻辑...
          }
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    };
    
    window.addEventListener('message', messageListener);
    
    // 请求初始数据
    vscode.postMessage({ type: 'requestData' });
    
    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, [graphData]);
  
  const handleNodeSelect = (nodeId: string) => {
    setSelectedNode(nodeId);
    // 通知 extension 节点被选中
    vscode.postMessage({ 
      type: 'nodeSelected', 
      nodeId 
    });
  };
  
  const handleRefresh = () => {
    setLoading(true);
    vscode.postMessage({ type: 'refreshData' });
  };
  
  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg text-text-dark dark:text-text-light">
      <Sidebar 
        selectedNode={selectedNode} 
        graphData={graphData} 
      />
      <div className="flex flex-col flex-1">
        <Toolbar 
          viewMode={viewMode} 
          setViewMode={setViewMode} 
          onRefresh={handleRefresh} 
        />
        <div className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
          ) : (
            <GraphView 
              data={graphData} 
              viewMode={viewMode} 
              onNodeSelect={handleNodeSelect}
              selectedNode={selectedNode}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App; 
