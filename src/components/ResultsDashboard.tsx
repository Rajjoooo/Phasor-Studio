import { useMemo } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useSignalStore } from '../store/signalStore'
import {
  calculateIntersection,
  type PhaseInput,
  type ApproachInput,
  type IntersectionResult,
} from '../utils/trafficCalculations'
import '../styles/resultsDashboard.css'

export default function ResultsDashboard({ onClose }: { onClose: () => void }) {
  const lanes = useEditorStore((s) => s.lanes)
  const approaches = useEditorStore((s) => s.approaches)
  const activePlan = useSignalStore((s) => {
    const id = s.activeSignalPlanId
    return s.signalPlans.find((p) => p.id === id)
  })

  // ── Build calculation inputs ──────────────────────
  const result: IntersectionResult | null = useMemo(() => {
    if (!activePlan || activePlan.phases.length === 0 || approaches.length === 0) {
      return null
    }

    // Build phase inputs
    const phaseInputs: PhaseInput[] = activePlan.phases.map((ph) => {
      // Find the critical (highest volume) approach in this phase
      const phaseApproaches = approaches.filter((a) => ph.approachIds.includes(a.id))

      let maxVolume = 0
      let maxSatFlow = 1800

      phaseApproaches.forEach((a) => {
        const aLanes = lanes.filter((l) => a.lanes.includes(l.id))
        const totalVol = aLanes.reduce((s, l) => s + l.trafficVolume, 0)
        const totalSat = aLanes.reduce((s, l) => s + l.saturationFlow, 0) || 1800
        if (totalVol > maxVolume) {
          maxVolume = totalVol
          maxSatFlow = totalSat
        }
      })

      return {
        phaseId: ph.id,
        phaseName: ph.name,
        greenTime: ph.greenTime,
        amberTime: ph.amberTime,
        allRedTime: ph.allRedTime,
        criticalVolume: maxVolume,
        criticalSatFlow: maxSatFlow,
      }
    })

    // Build approach inputs
    const approachInputs: ApproachInput[] = approaches.map((a) => {
      const aLanes = lanes.filter((l) => a.lanes.includes(l.id))
      const volume = aLanes.reduce((s, l) => s + l.trafficVolume, 0)
      const satFlow = aLanes.reduce((s, l) => s + l.saturationFlow, 0) || 1800

      // Find which phase this approach belongs to
      let phaseId = ''
      for (const ph of activePlan.phases) {
        if (ph.approachIds.includes(a.id)) {
          phaseId = ph.id
          break
        }
      }

      return {
        approachId: a.id,
        approachName: a.name,
        volume,
        saturationFlow: satFlow,
        phaseId,
      }
    })

    // Filter out approaches with no phase assignment
    const validApproaches = approachInputs.filter((a) => a.phaseId)
    if (validApproaches.length === 0) return null

    return calculateIntersection(
      phaseInputs,
      validApproaches,
      activePlan.lostTimePerPhase
    )
  }, [lanes, approaches, activePlan])

  // ── Metric card data ──────────────────────────────
  const metrics = result
    ? [
        {
          name: 'Queue Length',
          value: result.avgQueueLength.toFixed(1),
          unit: 'vehicles',
          status: result.avgQueueLength < 10 ? 'good' : result.avgQueueLength < 25 ? 'warning' : 'critical',
          statusLabel: result.avgQueueLength < 10 ? 'Short' : result.avgQueueLength < 25 ? 'Moderate' : 'Long',
          accent: '#06b6d4',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="6" width="4" height="14" rx="1" />
              <rect x="7" y="10" width="4" height="10" rx="1" />
              <rect x="13" y="2" width="4" height="18" rx="1" />
              <rect x="19" y="8" width="4" height="12" rx="1" />
            </svg>
          ),
        },
        {
          name: 'Average Delay',
          value: result.avgDelay.toFixed(1),
          unit: 'sec/veh',
          status: result.avgDelay <= 20 ? 'good' : result.avgDelay <= 55 ? 'warning' : 'critical',
          statusLabel: result.overallLOSLabel,
          accent: '#8b5cf6',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ),
        },
        {
          name: 'Throughput',
          value: result.totalThroughput.toLocaleString(),
          unit: 'PCU/hr',
          status: 'good',
          statusLabel: 'Total',
          accent: '#10b981',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          ),
        },
        {
          name: 'Congestion Index',
          value: result.congestionIndex.toFixed(3),
          unit: 'V/C ratio',
          status: result.congestionIndex < 0.8 ? 'good' : result.congestionIndex < 1.0 ? 'warning' : 'critical',
          statusLabel: result.congestionLabel,
          accent: result.congestionColor,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h20" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          ),
        },
        {
          name: 'Level of Service',
          value: result.overallLOS,
          unit: 'HCM Grade',
          status: ['A', 'B'].includes(result.overallLOS) ? 'good' : ['C', 'D'].includes(result.overallLOS) ? 'warning' : 'critical',
          statusLabel: result.overallLOSLabel,
          accent: result.overallLOSColor,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          ),
        },
        {
          name: 'Signal Efficiency',
          value: result.signalEfficiency.toFixed(1),
          unit: '%',
          status: result.signalEfficiency >= 80 ? 'good' : result.signalEfficiency >= 60 ? 'warning' : 'critical',
          statusLabel: result.signalEfficiency >= 80 ? 'Efficient' : result.signalEfficiency >= 60 ? 'Fair' : 'Poor',
          accent: '#f59e0b',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          ),
        },
      ]
    : []

  const statusColors: Record<string, { bg: string; text: string }> = {
    good: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
    critical: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
  }

  return (
    <div className="results-dashboard" id="results-dashboard">
      {/* Header */}
      <div className="results-dashboard__header">
        <span className="results-dashboard__title">
          <span className="results-dashboard__title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </span>
          Traffic Analysis Results
        </span>
        <div className="results-dashboard__actions">
          <button
            className="results-dashboard__close"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {!result ? (
        <div className="results-empty">
          <div className="results-empty__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <div className="results-empty__text">
            To see results, create lanes with traffic volumes, add approaches, create a signal plan with phases, and assign approaches to phases.
          </div>
        </div>
      ) : (
        <>
          {/* Webster Badge */}
          <div className="webster-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h20" />
            </svg>
            Webster's Optimum Cycle:
            <span className="webster-badge__value">{result.websterOptimumCycle}s</span>
            &nbsp;|&nbsp; Actual:
            <span className="webster-badge__value">{result.actualCycleLength}s</span>
            &nbsp;|&nbsp; Y =
            <span className="webster-badge__value">{result.sumFlowRatios}</span>
          </div>

          {/* Metric Cards */}
          <div className="results-grid">
            {metrics.map((m) => {
              const sc = statusColors[m.status] || statusColors.good
              return (
                <div
                  key={m.name}
                  className="metric-card"
                  style={{ '--metric-accent': m.accent } as React.CSSProperties}
                >
                  <div className="metric-card__header">
                    <div
                      className="metric-card__icon"
                      style={{ background: `${m.accent}20`, color: m.accent }}
                    >
                      {m.icon}
                    </div>
                    <span className="metric-card__name">{m.name}</span>
                  </div>
                  <div className="metric-card__value">
                    {m.value}
                    <span className="metric-card__unit"> {m.unit}</span>
                  </div>
                  <div
                    className="metric-card__status"
                    style={{ background: sc.bg, color: sc.text }}
                  >
                    {m.statusLabel}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Per-Approach Breakdown */}
          {result.approaches.length > 0 && (
            <div className="results-breakdown">
              <div className="results-breakdown__title">Per-Approach Breakdown</div>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Approach</th>
                    <th>Volume</th>
                    <th>Capacity</th>
                    <th>x (v/c)</th>
                    <th>λ (g/C)</th>
                    <th>Delay</th>
                    <th>Queue</th>
                    <th>LOS</th>
                  </tr>
                </thead>
                <tbody>
                  {result.approaches.map((a) => (
                    <tr key={a.approachId}>
                      <td style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                        {a.approachName}
                      </td>
                      <td>{a.volume}</td>
                      <td>{a.capacity}</td>
                      <td>{a.degreeOfSaturation}</td>
                      <td>{a.greenRatio}</td>
                      <td>{a.averageDelay}s</td>
                      <td>{a.queueLength} veh</td>
                      <td>
                        <span
                          className="results-table__los"
                          style={{ background: `${a.losColor}20`, color: a.losColor }}
                        >
                          {a.losGrade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
