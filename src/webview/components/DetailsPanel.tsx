import { FileNode } from '../../types';
import { getDirColor } from '../utils/colors';

interface Props {
  node: FileNode;
  allNodes: FileNode[];
  onNodeSelect: (id: string | null) => void;
  onOpenFile: (path: string) => void;
  onClose: () => void;
  expandLevel: number;
  onExpandLevelChange: (level: number) => void;
}

export default function DetailsPanel({
  node, allNodes, onNodeSelect, onOpenFile, onClose,
  expandLevel, onExpandLevelChange,
}: Props) {
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  const imports = node.imports.map(id => nodeMap.get(id)).filter(Boolean) as FileNode[];
  const importedBy = node.importedBy.map(id => nodeMap.get(id)).filter(Boolean) as FileNode[];

  return (
    <div
      className="flex flex-col h-full overflow-hidden border-l"
      style={{
        width: 260,
        minWidth: 260,
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        color: 'var(--panel-fg)',
      }}>

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b"
        style={{ borderColor: 'var(--panel-border)' }}>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold truncate">{node.name}</h3>
          <p className="text-[10px] opacity-50 truncate mt-0.5">{node.path}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 opacity-50 hover:opacity-100 text-sm leading-none p-1"
          title="Close">
          ✕
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b text-center"
        style={{ borderColor: 'var(--panel-border)' }}>
        <StatCard label="Imports" value={imports.length} color="var(--link-fg)" />
        <StatCard label="Imported by" value={importedBy.length} color="var(--warning)" />
      </div>

      {/* Info */}
      <div className="px-3 py-2 border-b text-[10px] space-y-1"
        style={{ borderColor: 'var(--panel-border)' }}>
        <div className="flex justify-between">
          <span className="opacity-50">Directory</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full"
              style={{ background: getDirColor(node.directory) }} />
            {node.directory || '.'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-50">Type</span>
          <span>{node.extension}</span>
        </div>
        {node.isEntry && (
          <div className="flex justify-between">
            <span className="opacity-50">Role</span>
            <span>Entry file</span>
          </div>
        )}
        {node.isOrphan && (
          <div className="flex justify-between">
            <span className="opacity-50">Status</span>
            <span style={{ color: 'var(--warning)' }}>Orphan</span>
          </div>
        )}
      </div>

      {/* Impact Analysis */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] opacity-50">Expand depth</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onExpandLevelChange(Math.max(1, expandLevel - 1))}
              className="w-5 h-5 text-[10px] rounded flex items-center justify-center"
              style={{ background: 'var(--input-bg)' }}
              disabled={expandLevel <= 1}>
              −
            </button>
            <span className="text-[10px] w-4 text-center">{expandLevel}</span>
            <button
              onClick={() => onExpandLevelChange(expandLevel + 1)}
              className="w-5 h-5 text-[10px] rounded flex items-center justify-center"
              style={{ background: 'var(--input-bg)' }}>
              +
            </button>
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto">
        <RefList
          title={`Imports (${imports.length})`}
          nodes={imports}
          onSelect={onNodeSelect}
          onOpen={onOpenFile}
          icon="↓"
          color="var(--link-fg)"
        />
        <RefList
          title={`Imported by (${importedBy.length})`}
          nodes={importedBy}
          onSelect={onNodeSelect}
          onOpen={onOpenFile}
          icon="↑"
          color="var(--warning)"
        />
      </div>

      {/* Open button */}
      <div className="p-2 border-t" style={{ borderColor: 'var(--panel-border)' }}>
        <button
          onClick={() => onOpenFile(node.path)}
          className="w-full py-1.5 text-[11px] rounded"
          style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)' }}>
          Open in Editor
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded p-2" style={{ background: 'var(--input-bg)' }}>
      <div className="text-base font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] opacity-50 mt-0.5">{label}</div>
    </div>
  );
}

function RefList({ title, nodes, onSelect, onOpen, icon, color }: {
  title: string;
  nodes: FileNode[];
  onSelect: (id: string | null) => void;
  onOpen: (path: string) => void;
  icon: string;
  color: string;
}) {
  return (
    <div className="border-b" style={{ borderColor: 'var(--panel-border)' }}>
      <div className="px-3 py-1.5 text-[10px] opacity-60 font-medium">{title}</div>
      {nodes.length === 0 ? (
        <p className="px-3 pb-2 text-[10px] opacity-30">None</p>
      ) : (
        <ul>
          {nodes.map(n => (
            <li
              key={n.id}
              className="flex items-center px-3 py-0.5 text-[11px] cursor-pointer truncate"
              style={{ color: 'var(--panel-fg)' }}
              onClick={() => onSelect(n.id)}
              onDoubleClick={() => onOpen(n.path)}
              title={n.path}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span className="mr-1.5" style={{ color }}>{icon}</span>
              {n.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
