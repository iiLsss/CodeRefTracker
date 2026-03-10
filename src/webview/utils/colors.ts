const PALETTE = [
  '#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452',
  '#6DC8EC', '#945FB9', '#FF9845', '#1E9493',
  '#FF99C3', '#6395F9', '#7CA2CC', '#9ECA80',
];

const EXT_COLORS: Record<string, string> = {
  '.ts': '#3178c6',
  '.tsx': '#3178c6',
  '.js': '#f1e05a',
  '.jsx': '#f1e05a',
  '.vue': '#41b883',
  '.css': '#563d7c',
  '.scss': '#c6538c',
  '.sass': '#c6538c',
  '.less': '#1d365d',
};

let dirColorMap: Map<string, string> | null = null;

export function buildDirColorMap(directories: string[]): void {
  dirColorMap = new Map();
  const unique = [...new Set(directories)].sort();
  unique.forEach((dir, i) => {
    dirColorMap!.set(dir, PALETTE[i % PALETTE.length]);
  });
}

export function getDirColor(directory: string): string {
  return dirColorMap?.get(directory) ?? PALETTE[0];
}

export function getExtColor(ext: string): string {
  return EXT_COLORS[ext] ?? '#999';
}

export function nodeRadius(importedByCount: number): number {
  return Math.max(5, Math.min(22, 5 + Math.sqrt(importedByCount) * 4));
}
