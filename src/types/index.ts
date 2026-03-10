export interface FileNode {
  id: string;
  name: string;
  path: string;
  extension: string;
  directory: string;
  imports: string[];
  importedBy: string[];
  isEntry: boolean;
  isOrphan: boolean;
}

export interface FileEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: FileNode[];
  edges: FileEdge[];
  stats: GraphStats;
  circularDeps: string[][];
}

export interface GraphStats {
  totalFiles: number;
  totalEdges: number;
  orphanCount: number;
  circularCount: number;
}

export type ExtensionMessage =
  | { type: 'graphData'; data: GraphData }
  | { type: 'focusNode'; nodeId: string }
  | { type: 'error'; message: string };

export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'openFile'; path: string }
  | { type: 'refresh' }
  | { type: 'requestData' };
