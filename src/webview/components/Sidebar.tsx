import { useState, useMemo } from 'react';
import { GraphData, FileNode } from '../../types';
import { FileFilter } from '../App';

interface Props {
  data: GraphData | null;
  allData: GraphData | null;
  selectedNode: string | null;
  onNodeSelect: (id: string | null) => void;
  onOpenFile: (path: string) => void;
  filter: FileFilter;
  onFilterChange: (f: FileFilter) => void;
}

interface DirTree {
  name: string;
  path: string;
  files: FileNode[];
  children: DirTree[];
  expanded: boolean;
}

export default function Sidebar({
  data, allData, selectedNode, onNodeSelect, onOpenFile, filter, onFilterChange,
}: Props) {
  const [showOrphans, setShowOrphans] = useState(true);
  const [showCircular, setShowCircular] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const orphanFiles = useMemo(
    () => (allData?.nodes ?? []).filter(n => n.isOrphan),
    [allData],
  );

  const extensions = useMemo(() => {
    const exts = new Set((allData?.nodes ?? []).map(n => n.extension));
    return [...exts].sort();
  }, [allData]);

  const directories = useMemo(() => {
    const dirs = new Set((allData?.nodes ?? []).map(n => n.directory));
    return ['', ...([...dirs].sort())];
  }, [allData]);

  const fileTree = useMemo(() => buildFileTree(data?.nodes ?? []), [data]);

  const toggleDir = (dir: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      next.has(dir) ? next.delete(dir) : next.add(dir);
      return next;
    });
  };

  const toggleType = (ext: string) => {
    const types = filter.types.includes(ext)
      ? filter.types.filter(t => t !== ext)
      : [...filter.types, ext];
    onFilterChange({ ...filter, types });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden border-r"
      style={{
        width: 230,
        minWidth: 230,
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        color: 'var(--panel-fg)',
      }}>

      {/* Search */}
      <div className="p-2 border-b" style={{ borderColor: 'var(--panel-border)' }}>
        <input
          type="text"
          placeholder="Search files..."
          value={filter.search}
          onChange={e => onFilterChange({ ...filter, search: e.target.value })}
          className="w-full px-2 py-1 text-xs rounded outline-none"
          style={{
            background: 'var(--input-bg)',
            color: 'var(--input-fg)',
            border: '1px solid var(--input-border)',
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Filters */}
        <Section title="Filter by Type" defaultOpen={false}>
          <div className="flex flex-wrap gap-1 px-2 pb-2">
            {extensions.map(ext => (
              <button
                key={ext}
                onClick={() => toggleType(ext)}
                className="px-1.5 py-0.5 text-[10px] rounded"
                style={{
                  background: filter.types.includes(ext) ? 'var(--active-bg)' : 'var(--input-bg)',
                  color: filter.types.includes(ext) ? 'var(--active-fg)' : 'var(--panel-fg)',
                }}>
                {ext}
              </button>
            ))}
          </div>
          {filter.directory && (
            <div className="px-2 pb-2">
              <select
                value={filter.directory}
                onChange={e => onFilterChange({ ...filter, directory: e.target.value })}
                className="w-full text-[10px] px-1 py-0.5 rounded"
                style={{ background: 'var(--input-bg)', color: 'var(--input-fg)', border: '1px solid var(--input-border)' }}>
                {directories.map(d => (
                  <option key={d} value={d}>{d || 'All directories'}</option>
                ))}
              </select>
            </div>
          )}
        </Section>

        {/* Orphan Files */}
        <Section
          title={`Orphan Files (${orphanFiles.length})`}
          open={showOrphans}
          onToggle={() => setShowOrphans(!showOrphans)}
          badge={orphanFiles.length}
          badgeColor={orphanFiles.length > 0 ? 'var(--warning)' : undefined}>
          {orphanFiles.length === 0 ? (
            <p className="px-3 py-1 text-[10px] opacity-50">No orphan files</p>
          ) : (
            <ul className="pb-1">
              {orphanFiles.map(f => (
                <FileItem
                  key={f.id}
                  node={f}
                  selected={f.id === selectedNode}
                  onClick={() => onNodeSelect(f.id)}
                  onDoubleClick={() => onOpenFile(f.path)}
                />
              ))}
            </ul>
          )}
        </Section>

        {/* Circular Dependencies */}
        <Section
          title={`Circular Deps (${allData?.circularDeps.length ?? 0})`}
          open={showCircular}
          onToggle={() => setShowCircular(!showCircular)}
          badge={allData?.circularDeps.length ?? 0}
          badgeColor={(allData?.circularDeps.length ?? 0) > 0 ? 'var(--error)' : undefined}>
          {(allData?.circularDeps.length ?? 0) === 0 ? (
            <p className="px-3 py-1 text-[10px] opacity-50">No circular dependencies</p>
          ) : (
            <ul className="pb-1">
              {allData!.circularDeps.map((cycle, i) => (
                <li key={i} className="px-3 py-1 text-[10px] opacity-70 cursor-pointer hover:opacity-100 truncate"
                  style={{ borderBottom: '1px solid var(--panel-border)' }}
                  title={cycle.join(' → ')}
                  onClick={() => onNodeSelect(cycle[0])}>
                  {cycle.map(f => f.split('/').pop()).join(' → ')}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* All Files */}
        <Section
          title={`Files (${data?.nodes.length ?? 0})`}
          open={showFiles}
          onToggle={() => setShowFiles(!showFiles)}>
          <div className="pb-1">
            {fileTree.map(dir => (
              <DirNode
                key={dir.path}
                dir={dir}
                expanded={expandedDirs}
                onToggle={toggleDir}
                selectedNode={selectedNode}
                onNodeSelect={onNodeSelect}
                onOpenFile={onOpenFile}
              />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children, open, onToggle, defaultOpen, badge, badgeColor }: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
  onToggle?: () => void;
  defaultOpen?: boolean;
  badge?: number;
  badgeColor?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? true);
  const isOpen = open ?? internalOpen;
  const toggle = onToggle ?? (() => setInternalOpen(!internalOpen));

  return (
    <div className="border-b" style={{ borderColor: 'var(--panel-border)' }}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium hover:opacity-80">
        <span className="flex items-center gap-1.5">
          <span className="opacity-50">{isOpen ? '▾' : '▸'}</span>
          {title}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="px-1.5 py-0.5 text-[9px] rounded-full"
            style={{ background: badgeColor ?? 'var(--badge-bg)', color: 'var(--badge-fg)' }}>
            {badge}
          </span>
        )}
      </button>
      {isOpen && children}
    </div>
  );
}

function FileItem({ node, selected, onClick, onDoubleClick }: {
  node: FileNode;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <li
      className="flex items-center px-3 py-0.5 text-[11px] cursor-pointer truncate"
      style={{
        background: selected ? 'var(--active-bg)' : 'transparent',
        color: selected ? 'var(--active-fg)' : 'inherit',
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={node.path}>
      <span className="opacity-40 mr-1.5 text-[9px]">{getExtLabel(node.extension)}</span>
      {node.name}
    </li>
  );
}

function DirNode({ dir, expanded, onToggle, selectedNode, onNodeSelect, onOpenFile }: {
  dir: DirTree;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  selectedNode: string | null;
  onNodeSelect: (id: string | null) => void;
  onOpenFile: (path: string) => void;
}) {
  const isOpen = expanded.has(dir.path);
  const hasChildren = dir.children.length > 0 || dir.files.length > 0;

  return (
    <div>
      <button
        onClick={() => onToggle(dir.path)}
        className="w-full flex items-center px-3 py-0.5 text-[11px] truncate hover:opacity-80"
        style={{ paddingLeft: `${(dir.path.split('/').length) * 8 + 12}px` }}>
        <span className="opacity-40 mr-1 text-[9px]">{hasChildren ? (isOpen ? '▾' : '▸') : ' '}</span>
        <span className="opacity-60">📁</span>
        <span className="ml-1">{dir.name}</span>
      </button>
      {isOpen && (
        <>
          {dir.children.map(c => (
            <DirNode
              key={c.path}
              dir={c}
              expanded={expanded}
              onToggle={onToggle}
              selectedNode={selectedNode}
              onNodeSelect={onNodeSelect}
              onOpenFile={onOpenFile}
            />
          ))}
          {dir.files.map(f => (
            <div key={f.id} style={{ paddingLeft: `${(dir.path.split('/').length + 1) * 8 + 12}px` }}>
              <FileItem
                node={f}
                selected={f.id === selectedNode}
                onClick={() => onNodeSelect(f.id)}
                onDoubleClick={() => onOpenFile(f.path)}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function buildFileTree(nodes: FileNode[]): DirTree[] {
  const root: DirTree = { name: '', path: '', files: [], children: [], expanded: true };
  const dirMap = new Map<string, DirTree>();
  dirMap.set('', root);

  for (const node of nodes) {
    const parts = node.directory === '.' ? [] : node.directory.split('/');
    let current = root;
    let pathSoFar = '';

    for (const part of parts) {
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
      let child = dirMap.get(pathSoFar);
      if (!child) {
        child = { name: part, path: pathSoFar, files: [], children: [], expanded: false };
        dirMap.set(pathSoFar, child);
        current.children.push(child);
      }
      current = child;
    }
    current.files.push(node);
  }

  return root.children.length > 0 ? root.children : [root];
}

function getExtLabel(ext: string): string {
  const map: Record<string, string> = {
    '.ts': 'TS', '.tsx': 'TX', '.js': 'JS', '.jsx': 'JX',
    '.vue': 'VU', '.css': 'CS', '.scss': 'SC',
  };
  return map[ext] ?? ext.slice(1, 3).toUpperCase();
}
