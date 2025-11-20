import React from 'react';
import { ViewMode } from '../types';

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
  onExport: (format: 'json' | 'csv') => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onRefresh,
  onExport,
  isFocusMode,
  onToggleFocusMode
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between">
      <div className="flex space-x-2">
        <button
          className={`px-3 py-1 rounded text-sm ${viewMode === 'flow' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          onClick={() => onViewModeChange('flow')}
        >
          Flow
        </button>
        <button
          className={`px-3 py-1 rounded text-sm ${viewMode === 'network' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          onClick={() => onViewModeChange('network')}
        >
          Network
        </button>
        <button
          className={`px-3 py-1 rounded text-sm ${viewMode === 'tree' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          onClick={() => onViewModeChange('tree')}
        >
          Tree
        </button>
        <button
          className={`px-3 py-1 rounded text-sm ${viewMode === 'matrix' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          onClick={() => onViewModeChange('matrix')}
        >
          Matrix
        </button>
        <button
          className={`px-3 py-1 rounded text-sm ${viewMode === 'heatmap' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          onClick={() => onViewModeChange('heatmap')}
        >
          Heatmap
        </button>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Focus Mode</span>
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isFocusMode ? 'bg-blue-600' : 'bg-gray-200'}`}
            onClick={onToggleFocusMode}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isFocusMode ? 'translate-x-6' : 'translate-x-1'}`}
            />
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
    </div>
  );
};

export default Toolbar;
