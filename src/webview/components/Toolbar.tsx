import React from 'react';
import { ViewMode } from '../types';

// 工具栏属性
interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
  onExport: (format: 'json' | 'csv') => void;
}

// 工具栏组件
const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onRefresh,
  onExport
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between">
      <div className="flex space-x-2">
        <button
          className={`px-3 py-1 rounded text-sm ${viewMode === 'network' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          onClick={() => onViewModeChange('network')}
        >
          Network
        </button>
        <button
          className={`px-3 py-1 rounded text-sm ${viewMode === 'tree' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          onClick={() => onViewModeChange('tree')}
        >
          Tree
        </button>
        <button
          className={`px-3 py-1 rounded text-sm ${viewMode === 'matrix' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          onClick={() => onViewModeChange('matrix')}
        >
          Matrix
        </button>
        <button
          className={`px-3 py-1 rounded text-sm ${viewMode === 'heatmap' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          onClick={() => onViewModeChange('heatmap')}
        >
          Heatmap
        </button>
      </div>
      <div className="flex space-x-2">
        <button
          className="px-3 py-1 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          onClick={onRefresh}
        >
          Refresh
        </button>
        <div className="relative group">
          <button
            className="px-3 py-1 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Export
          </button>
          <div className="absolute right-0 mt-1 w-24 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg hidden group-hover:block z-10">
            <button
              className="block w-full text-left px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => onExport('json')}
            >
              JSON
            </button>
            <button
              className="block w-full text-left px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => onExport('csv')}
            >
              CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar; 
