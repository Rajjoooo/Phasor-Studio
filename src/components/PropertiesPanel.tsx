import { useEditorStore } from '../store/editorStore'
import { useSignalStore } from '../store/signalStore'
import { createDefaultPhase, createDefaultSignalPlan } from '../objects/SignalPlan'
import { createDefaultApproach } from '../objects/Approach'
import type { Lane, TurningMovement } from '../objects/Lane'
import '../styles/propertiesPanel.css'

export default function PropertiesPanel() {
  const lanes = useEditorStore((s) => s.lanes)
  const approaches = useEditorStore((s) => s.approaches)
  const selectedLaneId = useEditorStore((s) => s.selectedLaneId)
  const updateLaneProperty = useEditorStore((s) => s.updateLaneProperty)
  const deleteLane = useEditorStore((s) => s.deleteLane)
  const selectLane = useEditorStore((s) => s.selectLane)
  const addApproach = useEditorStore((s) => s.addApproach)
  const addLaneToApproach = useEditorStore((s) => s.addLaneToApproach)
  const removeLaneFromApproach = useEditorStore((s) => s.removeLaneFromApproach)

  const signalPlans = useSignalStore((s) => s.signalPlans)
  const activeSignalPlanId = useSignalStore((s) => s.activeSignalPlanId)
  const addSignalPlan = useSignalStore((s) => s.addSignalPlan)
  const addPhase = useSignalStore((s) => s.addPhase)
  const removePhase = useSignalStore((s) => s.removePhase)
  const updatePhase = useSignalStore((s) => s.updatePhase)
  const addApproachToPhase = useSignalStore((s) => s.addApproachToPhase)
  const removeApproachFromPhase = useSignalStore((s) => s.removeApproachFromPhase)

  const selectedLane = lanes.find((l) => l.id === selectedLaneId)
  const activePlan = signalPlans.find((p) => p.id === activeSignalPlanId)

  // ── Helpers ──────────────────────────────────────
  const handleLaneChange = <K extends keyof Lane>(key: K, value: Lane[K]) => {
    if (!selectedLaneId) return
    updateLaneProperty(selectedLaneId, key, value)
  }

  const handleNumericChange = (key: keyof Lane, val: string) => {
    const num = parseFloat(val)
    if (!isNaN(num) && num >= 0) {
      handleLaneChange(key, num as Lane[typeof key])
    }
  }

  const handleCreateApproach = () => {
    const id = crypto.randomUUID()
    const name = `Approach ${approaches.length + 1}`
    addApproach(createDefaultApproach(id, name))
  }

  const handleCreateSignalPlan = () => {
    const plan = createDefaultSignalPlan(crypto.randomUUID())
    addSignalPlan(plan)
  }

  const handleAddPhase = () => {
    if (!activeSignalPlanId) return
    const phaseCount = activePlan?.phases.length ?? 0
    const phase = createDefaultPhase(crypto.randomUUID(), `Phase ${phaseCount + 1}`)
    addPhase(activeSignalPlanId, phase)
  }

  // Find which approach a lane belongs to
  const laneApproach = approaches.find((a) =>
    selectedLaneId ? a.lanes.includes(selectedLaneId) : false
  )

  return (
    <div className="props-panel" id="properties-panel">
      {/* Header */}
      <div className="props-panel__header">
        <span className="props-panel__title">
          <span className="props-panel__title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          Properties
        </span>
      </div>

      <div className="props-panel__body">
        {/* ── Lane Properties ───────────────────────── */}
        {selectedLane ? (
          <>
            <div className="props-section">
              <div className="props-section__label">Lane Properties</div>

              <div className="props-field">
                <label className="props-field__label">Road Name</label>
                <input
                  className="props-field__input"
                  type="text"
                  value={selectedLane.roadName}
                  onChange={(e) => handleLaneChange('roadName', e.target.value)}
                  placeholder="e.g. NH-48"
                />
              </div>

              <div className="props-field">
                <label className="props-field__label">Approach Name</label>
                <input
                  className="props-field__input"
                  type="text"
                  value={selectedLane.approachName}
                  onChange={(e) => handleLaneChange('approachName', e.target.value)}
                  placeholder="e.g. North"
                />
              </div>

              <div className="props-row">
                <div className="props-field">
                  <label className="props-field__label">Direction</label>
                  <select
                    className="props-field__select"
                    value={selectedLane.direction}
                    onChange={(e) => handleLaneChange('direction', e.target.value as 'inbound' | 'outbound')}
                  >
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                  </select>
                </div>

                <div className="props-field">
                  <label className="props-field__label">Turning</label>
                  <select
                    className="props-field__select"
                    value={selectedLane.turningMovement}
                    onChange={(e) => handleLaneChange('turningMovement', e.target.value as TurningMovement)}
                  >
                    <option value="through">Through</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>

              <div className="props-field">
                <label className="props-field__label">Number of Lanes</label>
                <input
                  className="props-field__input props-field__input--number"
                  type="number"
                  min={1}
                  max={8}
                  value={selectedLane.laneCount}
                  onChange={(e) => handleNumericChange('laneCount', e.target.value)}
                />
              </div>
            </div>

            {/* ── Traffic Data ────────────────────────── */}
            <div className="props-section">
              <div className="props-section__label">Traffic Data</div>

              <div className="props-row">
                <div className="props-field">
                  <label className="props-field__label">Volume (PCU/hr)</label>
                  <input
                    className="props-field__input props-field__input--number"
                    type="number"
                    min={0}
                    value={selectedLane.trafficVolume}
                    onChange={(e) => handleNumericChange('trafficVolume', e.target.value)}
                  />
                </div>

                <div className="props-field">
                  <label className="props-field__label">Sat. Flow (PCU/hr)</label>
                  <input
                    className="props-field__input props-field__input--number"
                    type="number"
                    min={0}
                    value={selectedLane.saturationFlow}
                    onChange={(e) => handleNumericChange('saturationFlow', e.target.value)}
                  />
                </div>
              </div>

              <div className="props-computed">
                <span className="props-computed__label">Flow Ratio (v/s)</span>
                <span className="props-computed__value">
                  {selectedLane.saturationFlow > 0
                    ? (selectedLane.trafficVolume / selectedLane.saturationFlow).toFixed(3)
                    : '—'}
                </span>
              </div>
            </div>

            {/* ── Approach Assignment ─────────────────── */}
            <div className="props-section">
              <div className="props-section__label">Approach Assignment</div>
              <div className="props-field">
                <label className="props-field__label">Assign to Approach</label>
                <select
                  className="props-field__select"
                  value={laneApproach?.id ?? ''}
                  onChange={(e) => {
                    // Remove from current approach
                    if (laneApproach && selectedLaneId) {
                      removeLaneFromApproach(laneApproach.id, selectedLaneId)
                    }
                    // Add to new approach
                    if (e.target.value && selectedLaneId) {
                      addLaneToApproach(e.target.value, selectedLaneId)
                    }
                  }}
                >
                  <option value="">— None —</option>
                  {approaches.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <button className="props-btn" onClick={handleCreateApproach}>
                + New Approach
              </button>
            </div>

            {/* ── Phase Assignment ────────────────────── */}
            <div className="props-section">
              <div className="props-section__label">Signal Phase</div>
              <div className="props-field">
                <label className="props-field__label">Assigned Phase</label>
                <select
                  className="props-field__select"
                  value={selectedLane.phaseId ?? ''}
                  onChange={(e) => handleLaneChange('phaseId', e.target.value || null)}
                >
                  <option value="">— None —</option>
                  {activePlan?.phases.map((ph) => (
                    <option key={ph.id} value={ph.id}>{ph.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Delete ──────────────────────────────── */}
            <button
              className="props-btn props-btn--danger"
              onClick={() => {
                deleteLane(selectedLaneId!)
                selectLane(null)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete Lane
            </button>
          </>
        ) : (
          <>
            {/* ── No Selection ───────────────────────── */}
            <div className="props-panel__empty">
              <span className="props-panel__empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                </svg>
              </span>
              <span className="props-panel__empty-text">
                Select a lane to view and edit its properties, or use the Draw tool to create one.
              </span>
            </div>
          </>
        )}

        {/* ── Signal Plan Section (always visible) ─── */}
        <div className="props-section" style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-xl)', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="props-section__label">Signal Plan</div>

          {!activePlan ? (
            <button className="props-btn props-btn--primary" onClick={handleCreateSignalPlan}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              Create Signal Plan
            </button>
          ) : (
            <div className="phase-editor">
              {/* Phase Timeline */}
              {activePlan.phases.length > 0 && (
                <div className="phase-timeline">
                  {activePlan.phases.map((ph) => {
                    const total = activePlan.cycleLength || 1
                    return (
                      <div key={ph.id} style={{ display: 'contents' }}>
                        <div
                          className="phase-timeline__segment phase-timeline__segment--green"
                          style={{ flex: ph.greenTime / total }}
                        >
                          {ph.greenTime > 5 ? `${ph.greenTime}s` : ''}
                        </div>
                        <div
                          className="phase-timeline__segment phase-timeline__segment--amber"
                          style={{ flex: ph.amberTime / total }}
                        />
                        <div
                          className="phase-timeline__segment phase-timeline__segment--red"
                          style={{ flex: ph.allRedTime / total }}
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="props-computed">
                <span className="props-computed__label">Cycle Length</span>
                <span className="props-computed__value">{activePlan.cycleLength}s</span>
              </div>

              {/* Phase Cards */}
              {activePlan.phases.map((ph) => (
                <div key={ph.id} className="phase-card">
                  <div className="phase-card__header">
                    <span className="phase-card__name">{ph.name}</span>
                    <button
                      className="phase-card__remove"
                      onClick={() => removePhase(activePlan.id, ph.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="phase-card__times">
                    <div className="phase-time">
                      <span className="phase-time__label phase-time__label--green">Green</span>
                      <input
                        className="phase-time__input"
                        type="number"
                        min={5}
                        max={120}
                        value={ph.greenTime}
                        onChange={(e) =>
                          updatePhase(activePlan.id, ph.id, {
                            greenTime: Math.max(5, parseInt(e.target.value) || 5),
                          })
                        }
                      />
                    </div>
                    <div className="phase-time">
                      <span className="phase-time__label phase-time__label--amber">Amber</span>
                      <input
                        className="phase-time__input"
                        type="number"
                        min={2}
                        max={5}
                        value={ph.amberTime}
                        onChange={(e) =>
                          updatePhase(activePlan.id, ph.id, {
                            amberTime: Math.max(2, parseInt(e.target.value) || 3),
                          })
                        }
                      />
                    </div>
                    <div className="phase-time">
                      <span className="phase-time__label phase-time__label--red">All-Red</span>
                      <input
                        className="phase-time__input"
                        type="number"
                        min={1}
                        max={5}
                        value={ph.allRedTime}
                        onChange={(e) =>
                          updatePhase(activePlan.id, ph.id, {
                            allRedTime: Math.max(1, parseInt(e.target.value) || 2),
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Approach assignment */}
                  <div className="phase-approaches">
                    {approaches.map((a) => {
                      const isAssigned = ph.approachIds.includes(a.id)
                      return (
                        <span
                          key={a.id}
                          className={`phase-approach-chip ${!isAssigned ? 'phase-approach-chip--unassigned' : ''}`}
                          onClick={() => {
                            if (isAssigned) {
                              removeApproachFromPhase(activePlan.id, ph.id, a.id)
                            } else {
                              addApproachToPhase(activePlan.id, ph.id, a.id)
                            }
                          }}
                        >
                          {a.name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}

              <button className="props-btn" onClick={handleAddPhase}>
                + Add Phase
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
