import { useMemo } from 'react';
import { GraphData, FileNode } from '../../types';
import { getDirColor, buildDirColorMap } from '../utils/colors';

interface Props {
  data: GraphData | null;
  onNodeSelect: (id: string | null) => void;
}

export default function Dashboard({ data, onNodeSelect }: Props) {
  const analysis = useMemo(() => {
    if (!data) return null;

    const dirs = [...new Set(data.nodes.map(n => n.directory))];
    buildDirColorMap(dirs);

    const byImportedBy = [...data.nodes].sort((a, b) => b.importedBy.length - a.importedBy.length);
    const byImports = [...data.nodes].sort((a, b) => b.imports.length - a.imports.length);
    const orphans = data.nodes.filter(n => n.isOrphan);

    const dirStats = dirs.map(dir => {
      const files = data.nodes.filter(n => n.directory === dir);
      const internal = data.edges.filter(e => {
        const s = data.nodes.find(n => n.id === e.source);
        const t = data.nodes.find(n => n.id === e.target);
        return s?.directory === dir && t?.directory === dir;
      }).length;
      const external = data.edges.filter(e => {
        const s = data.nodes.find(n => n.id === e.source);
        const t = data.nodes.find(n => n.id === e.target);
        return (s?.directory === dir || t?.directory === dir) && s?.directory !== t?.directory;
      }).length;
      return { dir, fileCount: files.length, internal, external };
    }).sort((a, b) => b.fileCount - a.fileCount);

    const maxRefs = Math.max(1, byImportedBy[0]?.importedBy.length ?? 1);
    const maxImports = Math.max(1, byImports[0]?.imports.length ?? 1);

    let healthScore = 100;
    if (data.stats.orphanCount > 0) healthScore -= Math.min(30, data.stats.orphanCount * 5);
    if (data.stats.circularCount > 0) healthScore -= Math.min(40, data.stats.circularCount * 10);
    const avgCoupling = data.stats.totalEdges / Math.max(1, data.stats.totalFiles);
    if (avgCoupling > 5) healthScore -= 10;
    healthScore = Math.max(0, healthScore);

    return { byImportedBy, byImports, orphans, dirStats, maxRefs, maxImports, healthScore };
  }, [data]);

  if (!data || !analysis) {
    return <div className="flex-1 flex items-center justify-center opacity-50 text-sm">No data</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h2 className="text-sm font-semibold mb-4 opacity-80">Project Health Dashboard</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <Card label="Files" value={data.stats.totalFiles} />
        <Card label="References" value={data.stats.totalEdges} />
        <Card label="Orphans" value={data.stats.orphanCount} color={data.stats.orphanCount > 0 ? 'var(--warning)' : undefined} />
        <Card label="Circular" value={data.stats.circularCount} color={data.stats.circularCount > 0 ? 'var(--error)' : undefined} />
      </div>

      {/* Health Score */}
      <div className="mb-5 p-3 rounded" style={{ background: 'var(--input-bg)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] opacity-60">Health Score</span>
          <span className="text-lg font-bold" style={{
            color: analysis.healthScore >= 80 ? '#5AD8A6' : analysis.healthScore >= 50 ? 'var(--warning)' : 'var(--error)',
          }}>
            {analysis.healthScore}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--panel-border)' }}>
          <div className="h-full rounded-full transition-all" style={{
            width: `${analysis.healthScore}%`,
            background: analysis.healthScore >= 80 ? '#5AD8A6' : analysis.healthScore >= 50 ? 'var(--warning)' : 'var(--error)',
          }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Most Referenced */}
        <div>
          <h3 className="text-[11px] font-medium opacity-60 mb-2">Most Referenced (Top 10)</h3>
          <ul className="space-y-1">
            {analysis.byImportedBy.slice(0, 10).map(n => (
              <BarItem
                key={n.id}
                node={n}
                value={n.importedBy.length}
                max={analysis.maxRefs}
                label={`${n.importedBy.length} refs`}
                onClick={() => onNodeSelect(n.id)}
                barColor="var(--link-fg)"
              />
            ))}
          </ul>
        </div>

        {/* Most Imports */}
        <div>
          <h3 className="text-[11px] font-medium opacity-60 mb-2">Most Imports (Top 10)</h3>
          <ul className="space-y-1">
            {analysis.byImports.slice(0, 10).map(n => (
              <BarItem
                key={n.id}
                node={n}
                value={n.imports.length}
                max={analysis.maxImports}
                label={`${n.imports.length} imports`}
                onClick={() => onNodeSelect(n.id)}
                barColor="var(--warning)"
              />
            ))}
          </ul>
        </div>
      </div>

      {/* Directory Stats */}
      {analysis.dirStats.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[11px] font-medium opacity-60 mb-2">Module Overview</h3>
          <div className="grid grid-cols-1 gap-1">
            {analysis.dirStats.map(d => (
              <div key={d.dir} className="flex items-center gap-2 py-1 px-2 rounded text-[11px]"
                style={{ background: 'var(--input-bg)' }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: getDirColor(d.dir) }} />
                <span className="flex-1 truncate">{d.dir || '.'}</span>
                <span className="opacity-50">{d.fileCount} files</span>
                <span className="opacity-40">|</span>
                <span className="opacity-50">{d.internal} int</span>
                <span className="opacity-50">{d.external} ext</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded p-3 text-center" style={{ background: 'var(--input-bg)' }}>
      <div className="text-xl font-bold" style={{ color: color ?? 'inherit' }}>{value}</div>
      <div className="text-[9px] opacity-50 mt-1">{label}</div>
    </div>
  );
}

function BarItem({ node, value, max, label, onClick, barColor }: {
  node: FileNode;
  value: number;
  max: number;
  label: string;
  onClick: () => void;
  barColor: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <li
      className="relative rounded overflow-hidden cursor-pointer px-2 py-1"
      style={{ background: 'var(--input-bg)' }}
      onClick={onClick}
      title={node.path}>
      <div className="absolute inset-0 opacity-15 rounded" style={{
        background: barColor,
        width: `${pct}%`,
      }} />
      <div className="relative flex items-center justify-between text-[10px]">
        <span className="truncate mr-2">{node.name}</span>
        <span className="opacity-60 flex-shrink-0">{label}</span>
      </div>
    </li>
  );
}
