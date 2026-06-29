import { useSignalStore } from '../store/signalStore'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { createDefaultPhase, createDefaultSignalPlan } from '../objects/SignalPlan'
import { websterRecommendation, type WebsterPhaseInput } from '../utils/websterCalculator'
import { ircRecommendation } from '../utils/ircCalculator'
import '../styles/signalTimingEditor.css'

export default function SignalTimingEditor({ onClose }: { onClose: () => void }) {
  const signalPlans = useSignalStore((s) => s.signalPlans)
  const activeSignalPlanId = useSignalStore((s) => s.activeSignalPlanId)
  const addSignalPlan = useSignalStore((s) => s.addSignalPlan)
  const addPhase = useSignalStore((s) => s.addPhase)
  const removePhase = useSignalStore((s) => s.removePhase)
  const updatePhase = useSignalStore((s) => s.updatePhase)
  const updateSignalPlan = useSignalStore((s) => s.updateSignalPlan)
  const addApproachToPhase = useSignalStore((s) => s.addApproachToPhase)
  const removeApproachFromPhase = useSignalStore((s) => s.removeApproachFromPhase)

  const approaches = useEditorStore((s) => s.approaches)
  const method = useProjectStore((s) => s.project?.designMethod ?? 'webster')

  const activePlan = signalPlans.find((p) => p.id === activeSignalPlanId)

  // ── Helpers ──────────────────────────────────────
  const handleCreatePlan = () => {
    const plan = createDefaultSignalPlan(crypto.randomUUID())
    addSignalPlan(plan)
  }

  const handleAddPhase = () => {
    if (!activeSignalPlanId) return
    const n = activePlan?.phases.length ?? 0
    addPhase(activeSignalPlanId, createDefaultPhase(crypto.randomUUID(), `Phase ${n + 1}`))
  }

  const handleOptimize = () => {
    if (!activePlan || activePlan.phases.length === 0) return

    // Build phase inputs from current approaches
    const phaseInputs: WebsterPhaseInput[] = activePlan.phases.map((ph) => {
      const phaseApproaches = approaches.filter((a) => ph.approachIds.includes(a.id))
      let maxVol = 0
      let maxSat = 1800
      phaseApproaches.forEach((a) => {
        if (a.pcuVolume > maxVol || a.totalVolume > maxVol) {
          maxVol = a.pcuVolume || a.totalVolume
          maxSat = a.saturationFlow || 1800
        }
      })
      return {
        phaseId: ph.id,
        phaseName: ph.name,
        greenTime: ph.greenTime,
        amberTime: ph.amberTime,
        allRedTime: ph.allRedTime,
        criticalVolume: maxVol,
        criticalSatFlow: maxSat,
      }
    })

    const rec = method === 'irc'
      ? ircRecommendation(phaseInputs)
      : websterRecommendation(phaseInputs)

    // Apply recommended cycle
    updateSignalPlan(activePlan.id, 'cycleLength', rec.recommendedCycle)
    updateSignalPlan(activePlan.id, 'isAutoCalc', true)

    // Apply recommended green times
    rec.recommendedGreens.forEach((g) => {
      updatePhase(activePlan.id, g.phaseId, { greenTime: g.greenTime })
    })
  }

  // Timeline calculations
  const totalCycleTime = activePlan
    ? activePlan.phases.reduce((s, p) => s + p.greenTime + p.amberTime + p.allRedTime, 0)
    : 0

  return (
    <div className="signal-editor-overlay" id="signal-timing-editor">
      <div className="signal-editor-panel">
        {/* Header */}
        <div className="signal-editor__header">
          <span className="signal-editor__title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="3" />
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="19" r="3" />
              <rect x="6" y="2" width="12" height="20" rx="2" />
            </svg>
            Signal Timing Editor
          </span>
          <div className="signal-editor__header-actions">
            <span className="signal-editor__method-badge">{method.toUpperCase()}</span>
            <button className="signal-editor__close" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="signal-editor__body">
          {/* No signal plan */}
          {!activePlan ? (
            <div className="signal-editor__empty">
              <p>No signal plan created yet.</p>
              <button className="signal-editor__create-btn" onClick={handleCreatePlan}>
                + Create Signal Plan
              </button>
            </div>
          ) : (
            <>
              {/* Validation: phases with no approaches */}
              {activePlan.phases.length > 0 && activePlan.phases.every((ph) => ph.approachIds.length === 0) && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '10px 14px', marginBottom: '16px',
                  background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '8px', fontSize: '12px', lineHeight: '1.5', color: '#fbbf24'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                  <span>
                    Phases have <strong>no approaches assigned</strong>. Open <strong>Intersection Config</strong> (2nd toolbar button) to link approaches to phases, or assign them below.
                  </span>
                </div>
              )}

              {/* Validation: no approaches at all */}
              {approaches.length === 0 && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '10px 14px', marginBottom: '16px',
                  background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '8px', fontSize: '12px', lineHeight: '1.5', color: '#fbbf24'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                  <span>
                    No traffic data entered. Open <strong>Traffic Inputs</strong> (1st toolbar button) first to configure approach volumes.
                  </span>
                </div>
              )}
              {/* Cycle info bar */}
              <div className="signal-editor__cycle-bar">
                <div className="cycle-info">
                  <span className="cycle-info__label">Cycle Length</span>
                  <span className="cycle-info__value">{activePlan.cycleLength || totalCycleTime}s</span>
                </div>
                <div className="cycle-info">
                  <span className="cycle-info__label">Phases</span>
                  <span className="cycle-info__value">{activePlan.phases.length}</span>
                </div>
                <div className="cycle-info">
                  <span className="cycle-info__label">Lost Time/Phase</span>
                  <input
                    className="cycle-info__input"
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={activePlan.lostTimePerPhase}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v)) updateSignalPlan(activePlan.id, 'lostTimePerPhase', v)
                    }}
                  />
                </div>
                <button
                  className="signal-editor__optimize-btn"
                  onClick={handleOptimize}
                  disabled={activePlan.phases.length === 0}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  Auto-Optimize ({method.toUpperCase()})
                </button>
              </div>

              {/* Visual Phase Timeline */}
              {activePlan.phases.length > 0 && totalCycleTime > 0 && (
                <div className="phase-timeline">
                  <div className="phase-timeline__label">Phase Timeline</div>
                  <div className="phase-timeline__bar">
                    {activePlan.phases.map((ph, i) => {
                      const greenWidth = (ph.greenTime / totalCycleTime) * 100
                      const amberWidth = (ph.amberTime / totalCycleTime) * 100
                      const redWidth = (ph.allRedTime / totalCycleTime) * 100
                      return (
                        <div key={ph.id} className="phase-timeline__segment" style={{ width: `${greenWidth + amberWidth + redWidth}%` }}>
                          <div className="phase-timeline__green" style={{ width: `${(ph.greenTime / (ph.greenTime + ph.amberTime + ph.allRedTime)) * 100}%` }}>
                            {ph.greenTime}s
                          </div>
                          <div className="phase-timeline__amber" style={{ width: `${(ph.amberTime / (ph.greenTime + ph.amberTime + ph.allRedTime)) * 100}%` }} />
                          <div className="phase-timeline__red" style={{ width: `${(ph.allRedTime / (ph.greenTime + ph.amberTime + ph.allRedTime)) * 100}%` }} />
                          <span className="phase-timeline__phase-label">P{i + 1}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="phase-timeline__scale">
                    <span>0s</span>
                    <span>{Math.round(totalCycleTime / 2)}s</span>
                    <span>{totalCycleTime}s</span>
                  </div>
                </div>
              )}

              {/* Phase Cards */}
              <div className="phase-cards">
                {activePlan.phases.map((ph, i) => (
                  <div key={ph.id} className="phase-card">
                    <div className="phase-card__header">
                      <span className="phase-card__name">
                        <span className="phase-card__num">{i + 1}</span>
                        {ph.name}
                      </span>
                      <button
                        className="phase-card__remove"
                        onClick={() => removePhase(activePlan.id, ph.id)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="phase-card__timings">
                      <div className="timing-field timing-field--green">
                        <label>Green</label>
                        <input
                          type="number" min="5" max="120"
                          value={ph.greenTime}
                          onChange={(e) => {
                            const v = parseInt(e.target.value)
                            if (!isNaN(v)) updatePhase(activePlan.id, ph.id, { greenTime: v })
                          }}
                        />
                        <span>s</span>
                      </div>
                      <div className="timing-field timing-field--amber">
                        <label>Yellow</label>
                        <input
                          type="number" min="2" max="5"
                          value={ph.amberTime}
                          onChange={(e) => {
                            const v = parseInt(e.target.value)
                            if (!isNaN(v)) updatePhase(activePlan.id, ph.id, { amberTime: v })
                          }}
                        />
                        <span>s</span>
                      </div>
                      <div className="timing-field timing-field--red">
                        <label>All-Red</label>
                        <input
                          type="number" min="0" max="5"
                          value={ph.allRedTime}
                          onChange={(e) => {
                            const v = parseInt(e.target.value)
                            if (!isNaN(v)) updatePhase(activePlan.id, ph.id, { allRedTime: v })
                          }}
                        />
                        <span>s</span>
                      </div>
                    </div>

                    {/* Approach assignments */}
                    <div className="phase-card__approaches">
                      <span className="phase-card__approaches-label">Approaches:</span>
                      <div className="phase-card__approach-chips">
                        {approaches.map((a) => {
                          const isAssigned = ph.approachIds.includes(a.id)
                          return (
                            <button
                              key={a.id}
                              className={`approach-chip ${isAssigned ? 'approach-chip--active' : ''}`}
                              onClick={() => {
                                if (isAssigned) {
                                  removeApproachFromPhase(activePlan.id, ph.id, a.id)
                                } else {
                                  addApproachToPhase(activePlan.id, ph.id, a.id)
                                }
                              }}
                            >
                              {a.name}
                            </button>
                          )
                        })}
                        {approaches.length === 0 && (
                          <span className="phase-card__no-approaches">
                            Add approaches in Traffic Inputs first
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <button className="phase-cards__add" onClick={handleAddPhase}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add Phase
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
