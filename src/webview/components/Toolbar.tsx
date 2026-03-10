import { GraphStats } from '../../types';
import { ViewLayout, ViewMode } from '../App';

interface Props {
  layout: ViewLayout;
  onLayoutChange: (l: ViewLayout) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  stats: GraphStats | null;
  onRefresh: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Toolbar({
  layout, onLayoutChange, viewMode, onViewModeChange,
  stats, onRefresh, sidebarOpen, onToggleSidebar,
}: Props) {
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 border-t select-none"
      style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>

      {/* Left: sidebar toggle + layout */}
      <div className="flex items-center gap-2">
        <ToolBtn
          onClick={onToggleSidebar}
          active={sidebarOpen}
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
          ☰
        </ToolBtn>

        <span className="opacity-20">|</span>

        <div className="flex items-center gap-0.5">
          <ToolBtn active={viewMode === 'graph'} onClick={() => onViewModeChange('graph')} title="Graph view">
            ◉
          </ToolBtn>
          <ToolBtn active={viewMode === 'dashboard'} onClick={() => onViewModeChange('dashboard')} title="Dashboard">
            ▦
          </ToolBtn>
        </div>

        {viewMode === 'graph' && (
          <>
            <span className="opacity-20">|</span>
            <div className="flex items-center gap-0.5">
              {(['force', 'tree', 'radial'] as ViewLayout[]).map(l => (
                <ToolBtn key={l} active={layout === l} onClick={() => onLayoutChange(l)} title={`${l} layout`}>
                  {l === 'force' ? '⊛' : l === 'tree' ? '⊞' : '◎'}
                </ToolBtn>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Center: stats */}
      {stats && (
        <div className="flex items-center gap-4 text-[10px] opacity-60">
          <span>{stats.totalFiles} files</span>
          <span>{stats.totalEdges} refs</span>
          {stats.orphanCount > 0 && (
            <span style={{ color: 'var(--warning)' }}>
              {stats.orphanCount} orphan{stats.orphanCount > 1 ? 's' : ''}
            </span>
          )}
          {stats.circularCount > 0 && (
            <span style={{ color: 'var(--error)' }}>
              {stats.circularCount} circular
            </span>
          )}
        </div>
      )}

      {/* Right: refresh */}
      <div className="flex items-center gap-1">
        <ToolBtn onClick={onRefresh} title="Refresh">
          ↻
        </ToolBtn>
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick, active, title }: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-6 h-6 flex items-center justify-center rounded text-xs"
      style={{
        background: active ? 'var(--active-bg)' : 'transparent',
        color: active ? 'var(--active-fg)' : 'var(--panel-fg)',
        opacity: active ? 1 : 0.7,
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = 'var(--hover-bg)';
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}>
      {children}
    </button>
  );
}
