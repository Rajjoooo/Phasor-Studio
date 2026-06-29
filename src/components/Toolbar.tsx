import { useEffect } from 'react'
import { useToolStore } from '../store/toolStore'
import type { Tool } from '../store/toolStore'
import '../styles/toolbar.css'

type ToolDef = {
  id: Tool
  label: string
  shortcut: string
  icon: JSX.Element
  group: 'nav' | 'draw' | 'edit' | 'analysis'
}

const TOOLS: ToolDef[] = [
  {
    id: 'pan',
    label: 'Pan',
    shortcut: 'P',
    group: 'nav',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13" />
      </svg>
    ),
  },
  {
    id: 'select',
    label: 'Select',
    shortcut: 'S',
    group: 'edit',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="m13 13 6 6" />
      </svg>
    ),
  },
  {
    id: 'draw',
    label: 'Draw Lane',
    shortcut: 'D',
    group: 'draw',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
      </svg>
    ),
  },
  {
    id: 'move',
    label: 'Move',
    shortcut: 'M',
    group: 'edit',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="5 9 2 12 5 15" />
        <polyline points="9 5 12 2 15 5" />
        <polyline points="15 19 12 22 9 19" />
        <polyline points="19 9 22 12 19 15" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="12" y1="2" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    id: 'vertex',
    label: 'Edit Vertices',
    shortcut: 'V',
    group: 'edit',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <path d="M10.4 13.6 6.7 17.3" />
        <path d="m13.6 10.4 3.7-3.7" />
      </svg>
    ),
  },
  {
    id: 'delete',
    label: 'Delete',
    shortcut: 'X',
    group: 'edit',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    ),
  },
]

const SHORTCUT_MAP: Record<string, Tool> = {}
TOOLS.forEach((t) => { SHORTCUT_MAP[t.shortcut.toLowerCase()] = t.id })

export default function Toolbar({
  onToggleResults,
  onToggleTrafficInputs,
  onToggleSignalEditor,
  onToggleIntersectionConfig,
  onToggleComparison,
  onToggleReport,
}: {
  onToggleResults?: () => void
  resultsOpen?: boolean
  onToggleTrafficInputs?: () => void
  onToggleSignalEditor?: () => void
  onToggleIntersectionConfig?: () => void
  onToggleComparison?: () => void
  onToggleReport?: () => void
}) {
  const activeTool = useToolStore((s) => s.activeTool)
  const setTool = useToolStore((s) => s.setTool)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return

      const tool = SHORTCUT_MAP[e.key.toLowerCase()]
      if (tool) setTool(tool)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setTool])

  // Group tools
  const navTools = TOOLS.filter((t) => t.group === 'nav')
  const drawTools = TOOLS.filter((t) => t.group === 'draw')
  const editTools = TOOLS.filter((t) => t.group === 'edit')

  return (
    <div className="toolbar" id="toolbar">
      {/* Brand */}
      <div className="toolbar__brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
      </div>

      {/* Navigation */}
      {navTools.map((t) => (
        <button
          key={t.id}
          className={`toolbar__btn ${activeTool === t.id ? 'toolbar__btn--active' : ''}`}
          data-tooltip={`${t.label} (${t.shortcut})`}
          onClick={() => setTool(t.id)}
          id={`tool-${t.id}`}
        >
          {t.icon}
        </button>
      ))}

      <div className="toolbar__divider" />

      {/* Drawing */}
      {drawTools.map((t) => (
        <button
          key={t.id}
          className={`toolbar__btn ${activeTool === t.id ? 'toolbar__btn--active' : ''}`}
          data-tooltip={`${t.label} (${t.shortcut})`}
          onClick={() => setTool(t.id)}
          id={`tool-${t.id}`}
        >
          {t.icon}
        </button>
      ))}

      <div className="toolbar__divider" />

      {/* Editing */}
      {editTools.map((t) => (
        <button
          key={t.id}
          className={`toolbar__btn ${activeTool === t.id ? 'toolbar__btn--active' : ''}`}
          data-tooltip={`${t.label} (${t.shortcut})`}
          onClick={() => setTool(t.id)}
          id={`tool-${t.id}`}
        >
          {t.icon}
        </button>
      ))}

      <div className="toolbar__spacer" />

      {/* Bottom: Analysis Tools (workflow order) */}

      {/* 1. Traffic Inputs */}
      {onToggleTrafficInputs && (
        <button
          className="toolbar__bottom-btn"
          data-tooltip="Traffic Inputs"
          onClick={onToggleTrafficInputs}
          id="toggle-traffic-inputs"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <rect x="7" y="10" width="3" height="8" rx="1" />
            <rect x="14" y="6" width="3" height="12" rx="1" />
          </svg>
        </button>
      )}

      {/* 2. Intersection Config */}
      {onToggleIntersectionConfig && (
        <button
          className="toolbar__bottom-btn"
          data-tooltip="Intersection Config"
          onClick={onToggleIntersectionConfig}
          id="toggle-intersection-config"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20M2 12h20" />
          </svg>
        </button>
      )}

      {/* 3. Signal Timing */}
      {onToggleSignalEditor && (
        <button
          className="toolbar__bottom-btn"
          data-tooltip="Signal Timing"
          onClick={onToggleSignalEditor}
          id="toggle-signal-editor"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="2" width="12" height="20" rx="2" />
            <circle cx="12" cy="7" r="2" />
            <circle cx="12" cy="13" r="2" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      )}

      {/* 4. Compare Designs */}
      {onToggleComparison && (
        <button
          className="toolbar__bottom-btn"
          data-tooltip="Compare Designs"
          onClick={onToggleComparison}
          id="toggle-comparison"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 16V8M12 16V5M17 16v-3" />
          </svg>
        </button>
      )}

      {/* 5. Results Dashboard */}
      {onToggleResults && (
        <button
          className="toolbar__bottom-btn"
          data-tooltip="Results Dashboard"
          onClick={onToggleResults}
          id="toggle-results"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </button>
      )}

      {/* 6. Report */}
      {onToggleReport && (
        <button
          className="toolbar__bottom-btn"
          data-tooltip="Engineering Report"
          onClick={onToggleReport}
          id="toggle-report"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 13h4M10 17h4M8 9h2" />
          </svg>
        </button>
      )}
    </div>
  )
}