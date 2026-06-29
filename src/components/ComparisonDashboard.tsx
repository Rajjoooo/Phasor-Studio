import { useEffect, useMemo } from 'react'
import { useAlternativeStore } from '../store/alternativeStore'
import { useEditorStore } from '../store/editorStore'
import { useSignalStore } from '../store/signalStore'
import { analyzeIntersection, type AnalysisApproach, type AnalysisSignalPlan } from '../utils/performanceAnalyzer'
import type { WebsterPhaseInput } from '../utils/websterCalculator'
import '../styles/comparisonDashboard.css'

const METRICS = [
  { key: 'actualCycleLength', label: 'Cycle Length', unit: 's', lower: true },
  { key: 'avgDelay', label: 'Avg Delay', unit: 's/veh', lower: true },
  { key: 'avgQueueLength', label: 'Queue Length', unit: 'veh', lower: true },
  { key: 'overallLOS', label: 'Level of Service', unit: '', lower: true },
  { key: 'totalThroughput', label: 'Throughput', unit: 'PCU/hr', lower: false },
  { key: 'congestionIndex', label: 'Congestion', unit: 'V/C', lower: true },
  { key: 'signalEfficiency', label: 'Efficiency', unit: '%', lower: false },
] as const

export default function ComparisonDashboard({ onClose }: { onClose: () => void }) {
  const alternatives = useAlternativeStore((s) => s.alternatives)
  const setResults = useAlternativeStore((s) => s.setResults)
  const initDefaults = useAlternativeStore((s) => s.initDefaults)

  const approaches = useEditorStore((s) => s.approaches)
  const activePlan = useSignalStore((s) => {
    const id = s.activeSignalPlanId
    return s.signalPlans.find((p) => p.id === id)
  })

  // Initialize defaults if empty
  useEffect(() => {
    if (alternatives.length === 0) {
      initDefaults()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Run all analyses
  const results = useMemo(() => {
    if (!activePlan || activePlan.phases.length === 0 || approaches.length === 0) return null

    const analysisApproaches: AnalysisApproach[] = approaches.map((a) => {
      let phaseId = ''
      for (const ph of activePlan.phases) {
        if (ph.approachIds.includes(a.id)) { phaseId = ph.id; break }
      }
      return {
        approachId: a.id,
        approachName: a.name,
        direction: a.direction,
        volume: a.pcuVolume || a.totalVolume || 0,
        saturationFlow: a.saturationFlow || 1800,
        laneCount: a.laneCount || 2,
        laneWidth: a.laneWidth || 3.5,
        leftTurnPct: a.leftTurnPct || 10,
        throughPct: a.throughPct || 70,
        rightTurnPct: a.rightTurnPct || 20,
        peakHourFactor: a.peakHourFactor || 0.92,
        phaseId,
      }
    }).filter((a) => a.phaseId)

    if (analysisApproaches.length === 0) return null

    const buildPhaseInputs = (): WebsterPhaseInput[] =>
      activePlan.phases.map((ph) => {
        const phApproaches = approaches.filter((a) => ph.approachIds.includes(a.id))
        let maxVol = 0, maxSat = 1800
        phApproaches.forEach((a) => {
          const v = a.pcuVolume || a.totalVolume
          if (v > maxVol) { maxVol = v; maxSat = a.saturationFlow || 1800 }
        })
        return {
          phaseId: ph.id, phaseName: ph.name,
          greenTime: ph.greenTime, amberTime: ph.amberTime, allRedTime: ph.allRedTime,
          criticalVolume: maxVol, criticalSatFlow: maxSat,
        }
      })

    const signalPlan: AnalysisSignalPlan = {
      phases: buildPhaseInputs(),
      cycleLength: activePlan.cycleLength,
      isAutoCalc: activePlan.isAutoCalc,
      lostTimePerPhase: activePlan.lostTimePerPhase,
    }

    return alternatives.map((alt) => {
      const res = analyzeIntersection(analysisApproaches, signalPlan, { method: alt.designMethod })
      // Cache results
      setResults(alt.id, res)
      return { alt, res }
    })
  }, [alternatives, approaches, activePlan, setResults])

  // Find best value per metric
  const bestValues = useMemo(() => {
    if (!results) return {}
    const best: Record<string, number> = {}
    METRICS.forEach((m) => {
      const values = results.map((r) => {
        const v = r.res[m.key as keyof typeof r.res]
        return typeof v === 'number' ? v : (m.key === 'overallLOS' ? 'ABCDEF'.indexOf(v as string) : 0)
      })
      best[m.key] = m.lower ? Math.min(...values) : Math.max(...values)
    })
    return best
  }, [results])

  const hasData = results && results.length > 0 && results[0].res.approaches.length > 0

  return (
    <div className="comparison-overlay" id="comparison-dashboard">
      <div className="comparison-panel">
        {/* Header */}
        <div className="comparison__header">
          <span className="comparison__title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 16V8M12 16V5M17 16v-3" />
            </svg>
            Design Comparison
          </span>
          <button className="comparison__close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="comparison__body">
          {!hasData ? (
            <div className="comparison__empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="M7 16V8M12 16V5M17 16v-3" />
              </svg>
              <p>Configure traffic inputs, add approaches, and create a signal plan with phases to compare design alternatives.</p>
            </div>
          ) : (
            <>
              {/* Comparison Table */}
              <div className="comparison-table-wrap">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th className="comparison-table__metric-col">Metric</th>
                      {results!.map(({ alt }) => (
                        <th key={alt.id} className="comparison-table__alt-col">
                          <span className="comparison-table__alt-name">{alt.name}</span>
                          <span className="comparison-table__alt-method">{alt.designMethod.toUpperCase()}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map((m) => (
                      <tr key={m.key}>
                        <td className="comparison-table__metric">
                          {m.label}
                          {m.unit && <span className="comparison-table__unit"> ({m.unit})</span>}
                        </td>
                        {results!.map(({ alt, res }) => {
                          const raw = res[m.key as keyof typeof res]
                          const val = typeof raw === 'number' ? raw : raw
                          const numVal = typeof raw === 'number' ? raw : (m.key === 'overallLOS' ? 'ABCDEF'.indexOf(raw as string) : -1)
                          const isBest = numVal === bestValues[m.key]
                          return (
                            <td key={alt.id} className={`comparison-table__value ${isBest ? 'comparison-table__value--best' : ''}`}>
                              {typeof val === 'number' ? val.toLocaleString() : val}
                              {isBest && <span className="comparison-table__best-badge">Best</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Visual Bar Charts */}
              <div className="comparison-charts">
                {(['avgDelay', 'totalThroughput', 'signalEfficiency'] as const).map((key) => {
                  const metric = METRICS.find((m) => m.key === key)!
                  const values = results!.map(({ res }) => res[key as keyof typeof res] as number)
                  const maxVal = Math.max(...values, 1)
                  return (
                    <div key={key} className="comparison-chart">
                      <div className="comparison-chart__title">{metric.label} ({metric.unit})</div>
                      <div className="comparison-chart__bars">
                        {results!.map(({ alt, res }) => {
                          const v = res[key as keyof typeof res] as number
                          const pct = (v / maxVal) * 100
                          const colors = ['#3b82f6', '#10b981', '#f59e0b']
                          const idx = results!.findIndex((r) => r.alt.id === alt.id)
                          return (
                            <div key={alt.id} className="comparison-chart__row">
                              <span className="comparison-chart__label">{alt.name}</span>
                              <div className="comparison-chart__track">
                                <div
                                  className="comparison-chart__fill"
                                  style={{ width: `${pct}%`, background: colors[idx % colors.length] }}
                                />
                              </div>
                              <span className="comparison-chart__val">{v}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
