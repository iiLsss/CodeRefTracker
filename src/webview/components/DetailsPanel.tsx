import React from 'react';
import { GraphData } from '../types';

interface DetailsPanelProps {
  graphData: GraphData;
  selectedNodeId: string | null;
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
  onOpenFile: (filePath: string) => void;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({
  graphData,
  selectedNodeId,
  onClose,
  onNodeSelect,
  onOpenFile
}) => {
  if (!selectedNodeId || !graphData) return null;

  const node = graphData.nodes.find(n => n.id === selectedNodeId);
  if (!node) return null;

  const incomingRefs = graphData.links
    .filter(link => link.target === selectedNodeId)
    .map(link => graphData.nodes.find(n => n.id === link.source))
    .filter(Boolean);

  const outgoingRefs = graphData.links
    .filter(link => link.source === selectedNodeId)
    .map(link => graphData.nodes.find(n => n.id === link.target))
    .filter(Boolean);

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-xl border-l border-gray-200 transform transition-transform duration-300 ease-in-out overflow-y-auto z-10">
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-800 truncate" title={node.name}>
            {node.name}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="text-sm text-gray-500 mb-1">Full Path</div>
          <div className="text-xs bg-gray-100 p-2 rounded break-all font-mono">
            {node.fullPath}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded text-center">
            <div className="text-2xl font-bold text-blue-600">{incomingRefs.length}</div>
            <div className="text-xs text-blue-800 uppercase tracking-wide">Used By</div>
          </div>
          <div className="bg-green-50 p-3 rounded text-center">
            <div className="text-2xl font-bold text-green-600">{outgoingRefs.length}</div>
            <div className="text-xs text-green-800 uppercase tracking-wide">Dependencies</div>
          </div>
        </div>

        <button
          onClick={() => onOpenFile(node.fullPath)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors mb-6 flex items-center justify-center gap-2"
        >
          <span>Open File</span>
        </button>

        {incomingRefs.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">Used By ({incomingRefs.length})</h3>
            <ul className="space-y-1">
              {incomingRefs.map((ref, idx) => (
                <li 
                  key={idx}
                  onClick={() => ref && onNodeSelect(ref.id)}
                  className="text-sm p-2 hover:bg-gray-100 rounded cursor-pointer flex items-center gap-2 text-gray-700"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span className="truncate">{ref?.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {outgoingRefs.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">Dependencies ({outgoingRefs.length})</h3>
            <ul className="space-y-1">
              {outgoingRefs.map((ref, idx) => (
                <li 
                  key={idx}
                  onClick={() => ref && onNodeSelect(ref.id)}
                  className="text-sm p-2 hover:bg-gray-100 rounded cursor-pointer flex items-center gap-2 text-gray-700"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="truncate">{ref?.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailsPanel;
