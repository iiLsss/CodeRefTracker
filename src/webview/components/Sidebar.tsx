import React from 'react';
import { GraphData, Node } from '../types';

interface SidebarProps {
  selectedNode: string | null;
  graphData: GraphData | null;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedNode, graphData }) => {
  if (!graphData) {
    return (
      <div className="w-64 bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold mb-4">Code References</h2>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const stats = graphData.stats;
  const selectedNodeData = selectedNode 
    ? graphData.nodes.find(node => node.id === selectedNode) 
    : null;

  const incomingLinks = selectedNode 
    ? graphData.links.filter(link => link.target === selectedNode)
    : [];

  const outgoingLinks = selectedNode 
    ? graphData.links.filter(link => link.source === selectedNode)
    : [];

  return (
    <div className="w-64 bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Code References</h2>
        
        {/* 全局统计 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Statistics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total Files:</span>
              <span className="text-sm font-medium">{stats.totalFiles}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total References:</span>
              <span className="text-sm font-medium">{stats.totalReferences}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg References:</span>
              <span className="text-sm font-medium">{stats.avgReferences.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* 选中节点信息 */}
        {selectedNodeData && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Selected File</h3>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <h4 className="font-medium mb-1 truncate" title={selectedNodeData.path}>
                {selectedNodeData.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate" title={selectedNodeData.path}>
                {selectedNodeData.path}
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Incoming</div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {selectedNodeData.incomingReferences}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Outgoing</div>
                  <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {selectedNodeData.outgoingReferences}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 引用列表 */}
        {selectedNodeData && (
          <>
            {/* 传入引用 */}
            {incomingLinks.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Incoming References ({incomingLinks.length})
                </h3>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {incomingLinks.map(link => {
                    const sourceNode = graphData.nodes.find(n => n.id === link.source);
                    return (
                      <li 
                        key={link.source} 
                        className="text-sm p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer truncate"
                        onClick={() => {
                          const vscode = acquireVsCodeApi();
                          vscode.postMessage({ 
                            type: 'openFile', 
                            path: sourceNode?.path 
                          });
                        }}
                        title={sourceNode?.path}
                      >
                        {sourceNode?.name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            {/* 传出引用 */}
            {outgoingLinks.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Outgoing References ({outgoingLinks.length})
                </h3>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {outgoingLinks.map(link => {
                    const targetNode = graphData.nodes.find(n => n.id === link.target);
                    return (
                      <li 
                        key={link.target} 
                        className="text-sm p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer truncate"
                        onClick={() => {
                          const vscode = acquireVsCodeApi();
                          vscode.postMessage({ 
                            type: 'openFile', 
                            path: targetNode?.path 
                          });
                        }}
                        title={targetNode?.path}
                      >
                        {targetNode?.name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 
