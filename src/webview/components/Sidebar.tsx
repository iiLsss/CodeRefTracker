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
      
    </div>
  );
};

export default Sidebar; 
