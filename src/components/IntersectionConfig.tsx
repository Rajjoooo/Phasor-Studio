import { useEditorStore } from '../store/editorStore'
import { useSignalStore } from '../store/signalStore'
import { createDefaultPhase, createDefaultSignalPlan } from '../objects/SignalPlan'
import '../styles/intersectionConfig.css'

const DIRECTION_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  north: { icon: '↑', label: 'North', color: '#3b82f6' },
  south: { icon: '↓', label: 'South', color: '#10b981' },
  east:  { icon: '→', label: 'East',  color: '#f59e0b' },
  west:  { icon: '←', label: 'West',  color: '#ef4444' },
  custom:{ icon: '◎', label: 'Custom', color: '#8b5cf6' },
}

export default function IntersectionConfig({ onClose }: { onClose: () => void }) {
  const approaches = useEditorStore((s) => s.approaches)
  const signalPlans = useSignalStore((s) => s.signalPlans)
  const activeSignalPlanId = useSignalStore((s) => s.activeSignalPlanId)
  const addSignalPlan = useSignalStore((s) => s.addSignalPlan)
  const addPhase = useSignalStore((s) => s.addPhase)
  const removePhase = useSignalStore((s) => s.removePhase)
  const addApproachToPhase = useSignalStore((s) => s.addApproachToPhase)
  const removeApproachFromPhase = useSignalStore((s) => s.removeApproachFromPhase)

  const activePlan = signalPlans.find((p) => p.id === activeSignalPlanId)

  // Auto-create plan if none exists
  const handleEnsurePlan = () => {
    if (!activePlan) {
      const plan = createDefaultSignalPlan(crypto.randomUUID())
      addSignalPlan(plan)
    }
  }

  // Quick setup: Create standard 2 or 4-phase plan
  const handleQuickSetup = (numPhases: 2 | 4) => {
    // Create plan if needed
    let planId = activePlan?.id
    if (!planId) {
      const plan = createDefaultSignalPlan(crypto.randomUUID())
      addSignalPlan(plan)
      planId = plan.id
    }

    // Remove existing phases
    if (activePlan) {
      activePlan.phases.forEach((ph) => removePhase(activePlan.id, ph.id))
    }

    const dirApproaches = approaches.filter((a) =>
      ['north', 'south', 'east', 'west'].includes(a.direction)
    )

    if (numPhases === 2) {
      // Phase 1: North + South
      const p1 = createDefaultPhase(crypto.randomUUID(), 'Phase 1 (N-S)')
      addPhase(planId, p1)
      dirApproaches.filter((a) => a.direction === 'north' || a.direction === 'south')
        .forEach((a) => addApproachToPhase(planId!, p1.id, a.id))

      // Phase 2: East + West
      const p2 = createDefaultPhase(crypto.randomUUID(), 'Phase 2 (E-W)')
      addPhase(planId, p2)
      dirApproaches.filter((a) => a.direction === 'east' || a.direction === 'west')
        .forEach((a) => addApproachToPhase(planId!, p2.id, a.id))
    } else {
      // 4-phase: one per approach
      const phaseNames = ['Phase 1 (N)', 'Phase 2 (E)', 'Phase 3 (S)', 'Phase 4 (W)']
      const directions = ['north', 'east', 'south', 'west']
      directions.forEach((dir, i) => {
        const ph = createDefaultPhase(crypto.randomUUID(), phaseNames[i])
        addPhase(planId!, ph)
        dirApproaches.filter((a) => a.direction === dir)
          .forEach((a) => addApproachToPhase(planId!, ph.id, a.id))
      })
    }
  }

  // Check current assignments
  const getApproachPhase = (approachId: string): string | null => {
    if (!activePlan) return null
    for (const ph of activePlan.phases) {
      if (ph.approachIds.includes(approachId)) return ph.id
    }
    return null
  }

  const unassignedApproaches = approaches.filter((a) => !getApproachPhase(a.id))
  const totalApproaches = approaches.length
  const assignedCount = totalApproaches - unassignedApproaches.length

  return (
    <div className="intx-config-overlay" id="intersection-config">
      <div className="intx-config-panel">
        {/* Header */}
        <div className="intx-config__header">
          <span className="intx-config__title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2v20M2 12h20" />
            </svg>
            Intersection Configuration
          </span>
          <button className="intx-config__close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="intx-config__body">
          {/* Validation Banner */}
          {approaches.length === 0 && (
            <div className="intx-config__warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              <div>
                <strong>No approaches configured.</strong>
                <p>Open <strong>Traffic Inputs</strong> (1st toolbar button) first to add approach data for N/S/E/W directions.</p>
              </div>
            </div>
          )}

          {/* Workflow hint */}
          {approaches.length > 0 && !activePlan && (
            <div className="intx-config__hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
              </svg>
              <span>Use <strong>Quick Setup</strong> below to automatically create phases and link your {approaches.length} approaches.</span>
            </div>
          )}

          {/* Quick Setup Section */}
          <div className="intx-config__section">
            <h3 className="intx-config__section-title">Quick Setup</h3>
            <p className="intx-config__section-desc">
              Automatically assign approaches to phases based on standard configurations.
            </p>
            <div className="quick-setup-buttons">
              <button
                className="quick-setup-btn"
                onClick={() => handleQuickSetup(2)}
                disabled={approaches.length === 0}
              >
                <div className="quick-setup-btn__visual">
                  <div className="quick-setup-btn__phase" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6' }}>
                    <span>↑</span><span>↓</span>
                  </div>
                  <div className="quick-setup-btn__phase" style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: '#f59e0b' }}>
                    <span>→</span><span>←</span>
                  </div>
                </div>
                <span className="quick-setup-btn__label">2-Phase</span>
                <span className="quick-setup-btn__desc">N-S / E-W opposing</span>
              </button>
              <button
                className="quick-setup-btn"
                onClick={() => handleQuickSetup(4)}
                disabled={approaches.length === 0}
              >
                <div className="quick-setup-btn__visual">
                  <div className="quick-setup-btn__phase quick-setup-btn__phase--small" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6' }}>
                    <span>↑</span>
                  </div>
                  <div className="quick-setup-btn__phase quick-setup-btn__phase--small" style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: '#f59e0b' }}>
                    <span>→</span>
                  </div>
                  <div className="quick-setup-btn__phase quick-setup-btn__phase--small" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' }}>
                    <span>↓</span>
                  </div>
                  <div className="quick-setup-btn__phase quick-setup-btn__phase--small" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }}>
                    <span>←</span>
                  </div>
                </div>
                <span className="quick-setup-btn__label">4-Phase</span>
                <span className="quick-setup-btn__desc">One approach per phase</span>
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="intx-config__status">
            <div className="intx-config__status-bar">
              <div
                className="intx-config__status-fill"
                style={{ width: `${totalApproaches > 0 ? (assignedCount / totalApproaches) * 100 : 0}%` }}
              />
            </div>
            <span className="intx-config__status-text">
              {assignedCount} / {totalApproaches} approaches assigned to phases
            </span>
            {unassignedApproaches.length > 0 && (
              <span className="intx-config__status-warn">
                ⚠ {unassignedApproaches.length} unassigned
              </span>
            )}
          </div>

          {/* Phase Assignment Matrix */}
          <div className="intx-config__section">
            <h3 className="intx-config__section-title">Phase Assignments</h3>
            {!activePlan || activePlan.phases.length === 0 ? (
              <div className="intx-config__empty">
                <p>No signal plan or phases configured.</p>
                <p>Use Quick Setup above, or create a signal plan in the Signal Timing Editor.</p>
              </div>
            ) : (
              <div className="phase-matrix">
                {activePlan.phases.map((ph, i) => (
                  <div key={ph.id} className="phase-matrix__row">
                    <div className="phase-matrix__phase-info">
                      <span className="phase-matrix__phase-num">{i + 1}</span>
                      <span className="phase-matrix__phase-name">{ph.name}</span>
                      <span className="phase-matrix__phase-timing">
                        G: {ph.greenTime}s | Y: {ph.amberTime}s | R: {ph.allRedTime}s
                      </span>
                    </div>
                    <div className="phase-matrix__approaches">
                      {approaches.map((a) => {
                        const isAssigned = ph.approachIds.includes(a.id)
                        const dirInfo = DIRECTION_LABELS[a.direction] || DIRECTION_LABELS.custom
                        return (
                          <button
                            key={a.id}
                            className={`phase-matrix__chip ${isAssigned ? 'phase-matrix__chip--active' : ''}`}
                            style={isAssigned ? {
                              background: `${dirInfo.color}15`,
                              borderColor: dirInfo.color,
                              color: dirInfo.color,
                            } : {}}
                            onClick={() => {
                              if (isAssigned) {
                                removeApproachFromPhase(activePlan.id, ph.id, a.id)
                              } else {
                                // Remove from any other phase first
                                activePlan.phases.forEach((otherPh) => {
                                  if (otherPh.approachIds.includes(a.id)) {
                                    removeApproachFromPhase(activePlan.id, otherPh.id, a.id)
                                  }
                                })
                                addApproachToPhase(activePlan.id, ph.id, a.id)
                              }
                            }}
                          >
                            <span className="phase-matrix__chip-icon">{dirInfo.icon}</span>
                            {a.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approach Summary Cards */}
          <div className="intx-config__section">
            <h3 className="intx-config__section-title">Approach Summary</h3>
            <div className="approach-summary-grid">
              {approaches.map((a) => {
                const dirInfo = DIRECTION_LABELS[a.direction] || DIRECTION_LABELS.custom
                const assignedPhaseId = getApproachPhase(a.id)
                const assignedPhase = activePlan?.phases.find((ph) => ph.id === assignedPhaseId)
                return (
                  <div key={a.id} className="approach-summary-card">
                    <div className="approach-summary-card__header" style={{ borderLeftColor: dirInfo.color }}>
                      <span className="approach-summary-card__icon" style={{ color: dirInfo.color }}>{dirInfo.icon}</span>
                      <span className="approach-summary-card__name">{a.name}</span>
                    </div>
                    <div className="approach-summary-card__body">
                      <div className="approach-summary-card__stat">
                        <span className="approach-summary-card__stat-label">Volume</span>
                        <span className="approach-summary-card__stat-value">
                          {a.pcuVolume || a.totalVolume || '—'} <small>PCU/hr</small>
                        </span>
                      </div>
                      <div className="approach-summary-card__stat">
                        <span className="approach-summary-card__stat-label">Sat. Flow</span>
                        <span className="approach-summary-card__stat-value">
                          {a.saturationFlow} <small>PCU/hr</small>
                        </span>
                      </div>
                      <div className="approach-summary-card__stat">
                        <span className="approach-summary-card__stat-label">Lanes</span>
                        <span className="approach-summary-card__stat-value">{a.laneCount}</span>
                      </div>
                      <div className="approach-summary-card__stat">
                        <span className="approach-summary-card__stat-label">Phase</span>
                        <span className={`approach-summary-card__stat-value ${assignedPhase ? '' : 'approach-summary-card__stat-value--warn'}`}>
                          {assignedPhase ? assignedPhase.name : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {approaches.length === 0 && (
                <div className="intx-config__empty">
                  <p>No approaches configured. Open Traffic Inputs to add approaches.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
