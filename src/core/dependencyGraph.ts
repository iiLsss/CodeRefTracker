import { FileNode, FileEdge, GraphData } from '../types';
import { FileScanner } from './fileScanner';
import { ReferenceParser } from './referenceParser';

const ENTRY_PATTERNS = [
  /^index\.(ts|tsx|js|jsx)$/i,
  /^main\.(ts|tsx|js|jsx)$/i,
  /^app\.(ts|tsx|js|jsx|vue)$/i,
  /^_app\.(ts|tsx|js|jsx)$/i,
  /^_document\.(ts|tsx|js|jsx)$/i,
  /^layout\.(ts|tsx|js|jsx)$/i,
  /^page\.(ts|tsx|js|jsx)$/i,
];

export class DependencyGraph {
  constructor(private workspaceRoot: string) {}

  async build(): Promise<GraphData> {
    const scanner = new FileScanner(this.workspaceRoot);
    const files = await scanner.scan();
    const fileSet = new Set(files);
    const parser = new ReferenceParser(this.workspaceRoot, fileSet);

    const nodeMap = new Map<string, FileNode>();
    const edges: FileEdge[] = [];

    for (const file of files) {
      const parts = file.split('/');
      nodeMap.set(file, {
        id: file,
        name: parts[parts.length - 1],
        path: file,
        extension: '.' + (file.split('.').pop() ?? ''),
        directory: parts.slice(0, -1).join('/') || '.',
        imports: [],
        importedBy: [],
        isEntry: this.isEntryFile(file),
        isOrphan: false,
      });
    }

    for (const file of files) {
      const refs = parser.parseFile(file);
      const node = nodeMap.get(file)!;
      node.imports = refs;
      for (const ref of refs) {
        const target = nodeMap.get(ref);
        if (target) {
          target.importedBy.push(file);
          edges.push({ source: file, target: ref });
        }
      }
    }

    for (const node of nodeMap.values()) {
      node.isOrphan = !node.isEntry && node.importedBy.length === 0;
    }

    const circularDeps = this.detectCycles(nodeMap);
    const nodes = Array.from(nodeMap.values());

    return {
      nodes,
      edges,
      stats: {
        totalFiles: nodes.length,
        totalEdges: edges.length,
        orphanCount: nodes.filter(n => n.isOrphan).length,
        circularCount: circularDeps.length,
      },
      circularDeps,
    };
  }

  private isEntryFile(filePath: string): boolean {
    const name = filePath.split('/').pop()!;
    return ENTRY_PATTERNS.some(p => p.test(name));
  }

  private detectCycles(nodeMap: Map<string, FileNode>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const stack: string[] = [];

    const dfs = (id: string) => {
      visited.add(id);
      inStack.add(id);
      stack.push(id);

      const node = nodeMap.get(id);
      if (node) {
        for (const imp of node.imports) {
          if (!nodeMap.has(imp)) continue;
          if (!visited.has(imp)) {
            dfs(imp);
          } else if (inStack.has(imp)) {
            const start = stack.indexOf(imp);
            if (start >= 0) cycles.push(stack.slice(start));
          }
        }
      }

      stack.pop();
      inStack.delete(id);
    };

    for (const id of nodeMap.keys()) {
      if (!visited.has(id)) dfs(id);
    }
    return cycles;
  }
}
