import React, { useState, useMemo } from 'react';
import { GraphData } from '../types';

// 侧边栏属性
interface SidebarProps {
  graphData: GraphData | null;
  selectedNode: string | null;
  onNodeSelect: (nodeId: string) => void;
  onOpenFile: (filePath: string) => void;
}

// 侧边栏组件
const Sidebar: React.FC<SidebarProps> = ({
  graphData,
  selectedNode,
  onNodeSelect,
  onOpenFile
}) => {
  // 状态
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'incomingCount' | 'outgoingCount'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // 过滤和排序节点
  const filteredNodes = useMemo(() => {
    if (!graphData) {return [];}
    
    // 过滤
    let nodes = graphData.nodes.filter(node => 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.fullPath.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // 排序
    nodes.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'incomingCount':
          valueA = a.incomingCount;
          valueB = b.incomingCount;
          break;
        case 'outgoingCount':
          valueA = a.outgoingCount;
          valueB = b.outgoingCount;
          break;
      }
      
      if (valueA < valueB) {return sortDirection === 'asc' ? -1 : 1;}
      if (valueA > valueB) {return sortDirection === 'asc' ? 1 : -1;}
      return 0;
    });
    
    return nodes;
  }, [graphData, searchTerm, sortBy, sortDirection]);
  
  // 处理排序
  const handleSort = (field: 'name' | 'incomingCount' | 'outgoingCount') => {
    if (sortBy === field) {
      // 切换排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 设置新的排序字段
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  // 获取选中节点的详细信息
  const selectedNodeDetails = useMemo(() => {
    if (!graphData || !selectedNode) {return null;}
    
    const node = graphData.nodes.find(n => n.id === selectedNode);
    if (!node) {return null;}
    
    // 获取传入引用
    const incomingRefs = graphData.links
      .filter(link => link.target === selectedNode)
      .map(link => {
        const sourceNode = graphData.nodes.find(n => n.id === link.source);
        return sourceNode ? {
          id: link.source,
          name: sourceNode.name,
          path: sourceNode.fullPath
        } : null;
      })
      .filter(Boolean);
    
    // 获取传出引用
    const outgoingRefs = graphData.links
      .filter(link => link.source === selectedNode)
      .map(link => {
        const targetNode = graphData.nodes.find(n => n.id === link.target);
        return targetNode ? {
          id: link.target,
          name: targetNode.name,
          path: targetNode.fullPath
        } : null;
      })
      .filter(Boolean);
    
    return {
      node,
      incomingRefs,
      outgoingRefs
    };
  }, [graphData, selectedNode]);
  
  // 如果没有数据，显示空状态
  if (!graphData) {
    return (
      <div className="w-64 h-full border-r border-gray-300 bg-gray-50 p-4">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }
  
  return (
    <div className="w-64 h-full border-r border-gray-300 bg-gray-50 flex flex-col">
      {/* 搜索框 */}
      <div className="p-2 border-b border-gray-300">
        <input
          type="text"
          placeholder="Search files..."
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* 文件列表 */}
      <div className="flex-1 overflow-auto">
        {/* 表头 */}
        <div className="sticky top-0 bg-gray-100 border-b border-gray-300 flex text-xs font-medium text-gray-600">
          <button 
            className="flex-1 p-2 text-left hover:bg-gray-200 flex items-center"
            onClick={() => handleSort('name')}
          >
            File
            {sortBy === 'name' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          <button 
            className="w-12 p-2 text-center hover:bg-gray-200 flex items-center justify-center"
            onClick={() => handleSort('incomingCount')}
            title="Incoming References"
          >
            In
            {sortBy === 'incomingCount' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          <button 
            className="w-12 p-2 text-center hover:bg-gray-200 flex items-center justify-center"
            onClick={() => handleSort('outgoingCount')}
            title="Outgoing References"
          >
            Out
            {sortBy === 'outgoingCount' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        </div>
        
        {/* 文件项 */}
        {filteredNodes.map(node => (
          <div 
            key={node.id}
            className={`flex border-b border-gray-200 cursor-pointer hover:bg-blue-50 ${
              selectedNode === node.id ? 'bg-blue-100' : ''
            }`}
            onClick={() => onNodeSelect(node.id)}
          >
            <div className="flex-1 p-2 text-sm truncate" title={node.fullPath}>
              {node.name}
            </div>
            <div className="w-12 p-2 text-center text-xs">
              {node.incomingCount}
            </div>
            <div className="w-12 p-2 text-center text-xs">
              {node.outgoingCount}
            </div>
          </div>
        ))}
      </div>
      
      {/* 选中节点详情 */}
      {selectedNodeDetails && (
        <div className="border-t border-gray-300 p-2 bg-white">
          <div className="font-medium text-sm mb-1 truncate" title={selectedNodeDetails.node.fullPath}>
            {selectedNodeDetails.node.name}
          </div>
          
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>In: {selectedNodeDetails.node.incomingCount}</span>
            <span>Out: {selectedNodeDetails.node.outgoingCount}</span>
          </div>
          
          <button
            className="w-full px-2 py-1 bg-blue-500 text-white rounded text-xs mb-2"
            onClick={() => onOpenFile(selectedNodeDetails.node.fullPath)}
          >
            Open File
          </button>
          
          {/* 引用标签页 */}
          <div className="text-xs">
            <div className="flex border-b border-gray-300">
              <div className="px-2 py-1 border-b-2 border-blue-500 font-medium">
                References
              </div>
            </div>
            
            {/* 引用列表 */}
            <div className="max-h-32 overflow-y-auto mt-1">
              {selectedNodeDetails.incomingRefs.length > 0 && (
                <div className="mb-2">
                  <div className="font-medium mb-1">Incoming:</div>
                  {selectedNodeDetails.incomingRefs.map((ref, index) => (
                    <div 
                      key={ref?.id || index}
                      className={`flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${ref?.id === selectedNode ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                      onClick={() => ref && onNodeSelect(ref.id)}
                      title={ref?.path || ''}
                    >
                      <span className="truncate">{ref?.name || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedNodeDetails.outgoingRefs.length > 0 && (
                <div>
                  <div className="font-medium mb-1">Outgoing:</div>
                  {selectedNodeDetails.outgoingRefs.map((ref, index) => (
                    <div 
                      key={ref?.id || index}
                      className={`flex justify-between items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${ref?.id === selectedNode ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                      onClick={() => ref && onNodeSelect(ref.id)}
                      title={ref?.path || ''}
                    >
                      <span className="truncate">{ref?.name || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedNodeDetails.incomingRefs.length === 0 && selectedNodeDetails.outgoingRefs.length === 0 && (
                <div className="text-gray-500 py-1">No references found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar; 
