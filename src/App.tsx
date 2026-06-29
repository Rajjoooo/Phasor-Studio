import { useState } from 'react'
import { useMapStore } from './store/mapStore'
import { useProjectStore } from './store/projectStore'
import { useEditorStore } from './store/editorStore'
import { useSignalStore } from './store/signalStore'
import { useAlternativeStore } from './store/alternativeStore'
import LocationDialog from './components/LocationDialog'
import MapBackground from './components/MapBackground'
import EditorCanvas from './canvas/EditorCanvas'
import Toolbar from './components/Toolbar'
import PropertiesPanel from './components/PropertiesPanel'
import ResultsDashboard from './components/ResultsDashboard'
import TrafficInputsPanel from './components/TrafficInputsPanel'
import SignalTimingEditor from './components/SignalTimingEditor'
import IntersectionConfig from './components/IntersectionConfig'
import ComparisonDashboard from './components/ComparisonDashboard'
import ReportGenerator from './components/ReportGenerator'

function App() {
  const isLocationSet = useMapStore((s) => s.isLocationSet)
  const isProjectReady = useProjectStore((s) => s.isProjectReady)
  const project = useProjectStore((s) => s.project)
  const locationName = useMapStore((s) => s.locationName)
  const resetLocation = useMapStore((s) => s.resetLocation)
  const resetProject = useProjectStore((s) => s.resetProject)

  const [showResults, setShowResults] = useState(false)
  const [showTrafficInputs, setShowTrafficInputs] = useState(false)
  const [showSignalEditor, setShowSignalEditor] = useState(false)
  const [showIntersectionConfig, setShowIntersectionConfig] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const handleNewProject = () => {
    // Reset all stores
    resetLocation()
    resetProject()
    // Clear persisted data for editor, signal, alternatives
    localStorage.removeItem('phasor-editor')
    localStorage.removeItem('phasor-signal')
    localStorage.removeItem('phasor-alternatives')
    // Force reload to clear Zustand in-memory state
    window.location.reload()
  }

  // Show location dialog if no project started yet
  if (!isLocationSet || !isProjectReady) {
    return <LocationDialog />
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Base: OSM Map */}
      <MapBackground />

      {/* Overlay: Konva Canvas */}
      <EditorCanvas />

      {/* UI: Toolbar */}
      <Toolbar
        onToggleResults={() => setShowResults((v) => !v)}
        resultsOpen={showResults}
        onToggleTrafficInputs={() => setShowTrafficInputs((v) => !v)}
        onToggleSignalEditor={() => setShowSignalEditor((v) => !v)}
        onToggleIntersectionConfig={() => setShowIntersectionConfig((v) => !v)}
        onToggleComparison={() => setShowComparison((v) => !v)}
        onToggleReport={() => setShowReport((v) => !v)}
      />

      {/* UI: Location + Method badge + New Project button */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: 'calc(var(--toolbar-width) + 12px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          fontWeight: 500,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {locationName}
        {project && (
          <>
            <span style={{ color: 'var(--border-default)', margin: '0 2px' }}>|</span>
            <span style={{
              padding: '1px 8px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--accent-blue)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {project.designMethod}
            </span>
          </>
        )}
        <span style={{ color: 'var(--border-default)', margin: '0 2px' }}>|</span>
        <button
          onClick={handleNewProject}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            padding: '2px 4px',
            borderRadius: 'var(--radius-sm)',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'none' }}
          title="Start a new project (resets all data)"
        >
          NEW PROJECT
        </button>
      </div>

      {/* UI: Properties Panel */}
      <PropertiesPanel />

      {/* Panels */}
      {showTrafficInputs && (
        <TrafficInputsPanel onClose={() => setShowTrafficInputs(false)} />
      )}
      {showIntersectionConfig && (
        <IntersectionConfig onClose={() => setShowIntersectionConfig(false)} />
      )}
      {showSignalEditor && (
        <SignalTimingEditor onClose={() => setShowSignalEditor(false)} />
      )}
      {showComparison && (
        <ComparisonDashboard onClose={() => setShowComparison(false)} />
      )}
      {showResults && (
        <ResultsDashboard onClose={() => setShowResults(false)} />
      )}
      {showReport && (
        <ReportGenerator onClose={() => setShowReport(false)} />
      )}
    </div>
  )
}

export default App