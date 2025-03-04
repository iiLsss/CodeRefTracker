// 视图模式类型
export type ViewMode = 'network' | 'tree' | 'matrix' | 'heatmap';

// 节点类型
export interface Node {
  id: string;
  path: string;
  name: string;
  type: string;
  incomingReferences: number;
  outgoingReferences: number;
  totalReferences: number;
  referenceCategory: 'high' | 'medium' | 'low';
}

// 链接类型
export interface Link {
  source: string;
  target: string;
  type: 'incoming' | 'outgoing';
  weight: number;
}

// 图数据类型
export interface GraphData {
  nodes: Node[];
  links: Link[];
  stats: {
    totalFiles: number;
    totalReferences: number;
    maxReferences: number;
    minReferences: number;
    avgReferences: number;
  };
}

// VSCode API 类型
declare global {
  function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
  
  interface Window {
    acquireVsCodeApi: typeof acquireVsCodeApi;
  }
} 
