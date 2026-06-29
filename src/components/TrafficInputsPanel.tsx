import { useCallback, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { createDefaultApproach, type ApproachDirection, type VehicleComposition, DEFAULT_COMPOSITION } from '../objects/Approach'
import { PCU_LABELS } from '../constants/pcuFactors'
import '../styles/trafficInputs.css'

const DIRECTIONS: { id: ApproachDirection; label: string; icon: string }[] = [
  { id: 'north', label: 'North', icon: '↑' },
  { id: 'south', label: 'South', icon: '↓' },
  { id: 'east', label: 'East', icon: '→' },
  { id: 'west', label: 'West', icon: '←' },
]

export default function TrafficInputsPanel({ onClose }: { onClose: () => void }) {
  const approaches = useEditorStore((s) => s.approaches)
  const addApproach = useEditorStore((s) => s.addApproach)
  const updateApproach = useEditorStore((s) => s.updateApproach)
  const deleteApproach = useEditorStore((s) => s.deleteApproach)
  const recalcApproachFromInputs = useEditorStore((s) => s.recalcApproachFromInputs)

  // Ensure 4 default approaches exist — run as effect, not during render
  useEffect(() => {
    const existing = new Set(approaches.map((a) => a.direction))
    const hasDirApproaches = DIRECTIONS.some((d) => existing.has(d.id))
    if (!hasDirApproaches) {
      DIRECTIONS.forEach((dir) => {
        if (!existing.has(dir.id)) {
          const id = crypto.randomUUID()
          addApproach(createDefaultApproach(id, dir.label, dir.id))
        }
      })
    }
  }, []) // Only on mount

  const handleNumericField = (approachId: string, field: string, val: string) => {
    const num = parseFloat(val)
    if (isNaN(num) || num < 0) return
    updateApproach(approachId, field as keyof typeof approaches[0], num as never)
    // Debounce recalc
    setTimeout(() => recalcApproachFromInputs(approachId), 100)
  }

  const handleCompositionChange = (approachId: string, vehicleType: string, val: string) => {
    const num = parseInt(val)
    if (isNaN(num) || num < 0) return
    const approach = approaches.find((a) => a.id === approachId)
    if (!approach) return
    const updated: VehicleComposition = { ...approach.vehicleComposition, [vehicleType]: num }
    updateApproach(approachId, 'vehicleComposition', updated)
    setTimeout(() => recalcApproachFromInputs(approachId), 100)
  }

  const dirApproaches = DIRECTIONS.map((dir) => ({
    ...dir,
    approach: approaches.find((a) => a.direction === dir.id),
  }))

  return (
    <div className="traffic-inputs-overlay" id="traffic-inputs-panel">
      <div className="traffic-inputs-panel">
        {/* Header */}
        <div className="traffic-inputs__header">
          <span className="traffic-inputs__title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <rect x="7" y="10" width="3" height="8" rx="1" />
              <rect x="14" y="6" width="3" height="12" rx="1" />
            </svg>
            Traffic Inputs
          </span>
          <button className="traffic-inputs__close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Approach tabs */}
        <div className="traffic-inputs__body">
          {dirApproaches.map(({ id, label, icon, approach }) => {
            if (!approach) return null
            return (
              <div key={id} className="approach-section" id={`approach-${id}`}>
                <div className="approach-section__header">
                  <span className="approach-section__direction">
                    <span className="approach-section__icon">{icon}</span>
                    {label} Approach
                  </span>
                  <div className="approach-section__computed">
                    <span className="approach-section__pcu">
                      {approach.pcuVolume > 0 ? `${approach.pcuVolume} PCU/hr` : '—'}
                    </span>
                    <span className="approach-section__ratio">
                      y = {approach.criticalFlowRatio}
                    </span>
                  </div>
                </div>

                <div className="approach-section__grid">
                  {/* Row 1: Volume & PHF */}
                  <div className="input-field">
                    <label className="input-field__label">Traffic Volume</label>
                    <div className="input-field__row">
                      <input
                        className="input-field__input"
                        type="number"
                        min="0"
                        value={approach.trafficVolume || ''}
                        placeholder="0"
                        onChange={(e) => handleNumericField(approach.id, 'trafficVolume', e.target.value)}
                      />
                      <span className="input-field__unit">veh/hr</span>
                    </div>
                  </div>
                  <div className="input-field">
                    <label className="input-field__label">Peak Hour Factor</label>
                    <div className="input-field__row">
                      <input
                        className="input-field__input"
                        type="number"
                        min="0.1"
                        max="1.0"
                        step="0.01"
                        value={approach.peakHourFactor}
                        onChange={(e) => handleNumericField(approach.id, 'peakHourFactor', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Row 2: Turn Percentages */}
                  <div className="input-field">
                    <label className="input-field__label">Left Turn %</label>
                    <div className="input-field__row">
                      <input
                        className="input-field__input"
                        type="number"
                        min="0"
                        max="100"
                        value={approach.leftTurnPct}
                        onChange={(e) => handleNumericField(approach.id, 'leftTurnPct', e.target.value)}
                      />
                      <span className="input-field__unit">%</span>
                    </div>
                  </div>
                  <div className="input-field">
                    <label className="input-field__label">Through %</label>
                    <div className="input-field__row">
                      <input
                        className="input-field__input"
                        type="number"
                        min="0"
                        max="100"
                        value={approach.throughPct}
                        onChange={(e) => handleNumericField(approach.id, 'throughPct', e.target.value)}
                      />
                      <span className="input-field__unit">%</span>
                    </div>
                  </div>
                  <div className="input-field">
                    <label className="input-field__label">Right Turn %</label>
                    <div className="input-field__row">
                      <input
                        className="input-field__input"
                        type="number"
                        min="0"
                        max="100"
                        value={approach.rightTurnPct}
                        onChange={(e) => handleNumericField(approach.id, 'rightTurnPct', e.target.value)}
                      />
                      <span className="input-field__unit">%</span>
                    </div>
                  </div>

                  {/* Row 3: Sat flow, Lane Width, Lane Count */}
                  <div className="input-field">
                    <label className="input-field__label">Saturation Flow</label>
                    <div className="input-field__row">
                      <input
                        className="input-field__input"
                        type="number"
                        min="0"
                        value={approach.saturationFlow}
                        onChange={(e) => handleNumericField(approach.id, 'saturationFlow', e.target.value)}
                      />
                      <span className="input-field__unit">PCU/hr</span>
                    </div>
                  </div>
                  <div className="input-field">
                    <label className="input-field__label">Lane Width</label>
                    <div className="input-field__row">
                      <input
                        className="input-field__input"
                        type="number"
                        min="2.5"
                        max="5.0"
                        step="0.1"
                        value={approach.laneWidth}
                        onChange={(e) => handleNumericField(approach.id, 'laneWidth', e.target.value)}
                      />
                      <span className="input-field__unit">m</span>
                    </div>
                  </div>
                  <div className="input-field">
                    <label className="input-field__label">Lanes</label>
                    <div className="input-field__row">
                      <input
                        className="input-field__input"
                        type="number"
                        min="1"
                        max="6"
                        value={approach.laneCount}
                        onChange={(e) => handleNumericField(approach.id, 'laneCount', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Composition */}
                <details className="composition-details">
                  <summary className="composition-details__summary">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    Vehicle Composition
                    <span className="composition-details__hint">(optional — overrides raw volume)</span>
                  </summary>
                  <div className="composition-grid">
                    {Object.entries(PCU_LABELS).filter(([key]) => key in DEFAULT_COMPOSITION).map(([key, label]) => (
                      <div key={key} className="composition-field">
                        <label className="composition-field__label">{label}</label>
                        <input
                          className="composition-field__input"
                          type="number"
                          min="0"
                          value={(approach.vehicleComposition as Record<string, number>)[key] || ''}
                          placeholder="0"
                          onChange={(e) => handleCompositionChange(approach.id, key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </details>

                {/* Derived values */}
                {approach.pcuVolume > 0 && (
                  <div className="approach-section__derived">
                    <div className="derived-chip">
                      <span className="derived-chip__label">Left</span>
                      <span className="derived-chip__value">{approach.leftTurnVolume} PCU/hr</span>
                    </div>
                    <div className="derived-chip">
                      <span className="derived-chip__label">Through</span>
                      <span className="derived-chip__value">{approach.throughVolume} PCU/hr</span>
                    </div>
                    <div className="derived-chip">
                      <span className="derived-chip__label">Right</span>
                      <span className="derived-chip__value">{approach.rightTurnVolume} PCU/hr</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
