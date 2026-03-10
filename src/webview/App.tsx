import { useState, useEffect, useCallback } from 'react';
import { GraphData, ExtensionMessage, WebviewMessage } from '../types';
import vscode from './utils/vscode';
import Sidebar from './components/Sidebar';
import GraphView from './components/GraphView';
import DetailsPanel from './components/DetailsPanel';
import Toolbar from './components/Toolbar';
import Dashboard from './components/Dashboard';

export type ViewLayout = 'force' | 'tree' | 'radial';
export type ViewMode = 'graph' | 'dashboard';

export interface FileFilter {
  types: string[];
  directory: string;
  search: string;
}

export default function App() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [layout, setLayout] = useState<ViewLayout>('force');
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [filter, setFilter] = useState<FileFilter>({ types: [], directory: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandLevel, setExpandLevel] = useState(1);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data as ExtensionMessage;
      switch (msg.type) {
        case 'graphData':
          setGraphData(msg.data);
          setLoading(false);
          setError(null);
          break;
        case 'focusNode':
          setSelectedNode(msg.nodeId);
          setViewMode('graph');
          break;
        case 'error':
          setError(msg.message);
          setLoading(false);
          break;
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'ready' } as WebviewMessage);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNode(nodeId);
    setExpandLevel(1);
  }, []);

  const handleOpenFile = useCallback((p: string) => {
    vscode.postMessage({ type: 'openFile', path: p } as WebviewMessage);
  }, []);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    vscode.postMessage({ type: 'refresh' } as WebviewMessage);
  }, []);

  const selectedFileNode = graphData?.nodes.find(n => n.id === selectedNode) ?? null;
  const filteredData = graphData ? applyFilters(graphData, filter) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-current border-t-transparent rounded-full mx-auto mb-3 opacity-40" />
          <p className="text-sm opacity-50">Analyzing references...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <p className="text-sm mb-3 opacity-70">{error}</p>
          <button onClick={handleRefresh} className="px-4 py-1.5 text-xs rounded"
            style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0">
        {sidebarOpen && (
          <Sidebar
            data={filteredData}
            allData={graphData}
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
            onOpenFile={handleOpenFile}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}
        {viewMode === 'graph' ? (
          <GraphView
            data={filteredData}
            allData={graphData}
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
            onOpenFile={handleOpenFile}
            layout={layout}
            expandLevel={expandLevel}
          />
        ) : (
          <Dashboard data={graphData} onNodeSelect={handleNodeSelect} />
        )}
        {selectedFileNode && viewMode === 'graph' && (
          <DetailsPanel
            node={selectedFileNode}
            allNodes={graphData?.nodes ?? []}
            onNodeSelect={handleNodeSelect}
            onOpenFile={handleOpenFile}
            onClose={() => setSelectedNode(null)}
            expandLevel={expandLevel}
            onExpandLevelChange={setExpandLevel}
          />
        )}
      </div>
      <Toolbar
        layout={layout}
        onLayoutChange={setLayout}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        stats={graphData?.stats ?? null}
        onRefresh={handleRefresh}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
    </div>
  );
}

function applyFilters(data: GraphData, filter: FileFilter): GraphData {
  let nodes = data.nodes;

  if (filter.search) {
    const q = filter.search.toLowerCase();
    nodes = nodes.filter(n =>
      n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q),
    );
  }

  if (filter.types.length > 0) {
    nodes = nodes.filter(n => filter.types.includes(n.extension));
  }

  if (filter.directory) {
    nodes = nodes.filter(n => n.path.startsWith(filter.directory));
  }

  const ids = new Set(nodes.map(n => n.id));
  const edges = data.edges.filter(e => ids.has(e.source) && ids.has(e.target));

  return { nodes, edges, stats: data.stats, circularDeps: data.circularDeps };
}
