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

// 图表数据类型
export interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    fullPath: string;
    incomingCount: number;
    outgoingCount: number;
    lastModified?: number;
  }>;
  links: Array<{
    source: string;
    target: string;
  }>;
  stats: {
    totalFiles: number;
    totalReferences: number;
    maxIncomingReferences: number;
    maxOutgoingReferences: number;
    averageReferences: number;
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
