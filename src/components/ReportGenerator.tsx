import { useMemo, useRef } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { useSignalStore } from '../store/signalStore'
import { useMapStore } from '../store/mapStore'
import { analyzeIntersection, type AnalysisApproach, type AnalysisSignalPlan } from '../utils/performanceAnalyzer'
import type { WebsterPhaseInput } from '../utils/websterCalculator'
import '../styles/reportGenerator.css'

export default function ReportGenerator({ onClose }: { onClose: () => void }) {
  const reportRef = useRef<HTMLDivElement>(null)

  const project = useProjectStore((s) => s.project)
  const locationName = useMapStore((s) => s.locationName)
  const approaches = useEditorStore((s) => s.approaches)
  const activePlan = useSignalStore((s) => {
    const id = s.activeSignalPlanId
    return s.signalPlans.find((p) => p.id === id)
  })

  const method = project?.designMethod ?? 'webster'

  // Run analysis
  const result = useMemo(() => {
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

    const phaseInputs: WebsterPhaseInput[] = activePlan.phases.map((ph) => {
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
      phases: phaseInputs,
      cycleLength: activePlan.cycleLength,
      isAutoCalc: activePlan.isAutoCalc,
      lostTimePerPhase: activePlan.lostTimePerPhase,
    }

    return analyzeIntersection(analysisApproaches, signalPlan, { method })
  }, [approaches, activePlan, method])

  const handlePrint = () => {
    const printContents = reportRef.current?.innerHTML
    if (!printContents) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Traffic Design Report — ${locationName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; line-height: 1.5; font-size: 12px; }
          h1 { font-size: 20px; margin-bottom: 4px; color: #0f1729; }
          h2 { font-size: 14px; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #3b82f6; color: #1e3a5f; }
          h3 { font-size: 12px; margin: 16px 0 4px; color: #374151; }
          .report-header-sub { color: #6b7280; font-size: 11px; margin-bottom: 8px; }
          .report-meta { display: flex; gap: 24px; margin-bottom: 20px; font-size: 11px; color: #4b5563; }
          .report-meta span { background: #f3f4f6; padding: 2px 8px; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 11px; }
          th { background: #f8fafc; text-align: left; padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600; color: #374151; }
          td { padding: 5px 10px; border: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background: #f8fafc; }
          .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 8px 0 16px; }
          .metric-card { padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; }
          .metric-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
          .metric-value { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-top: 2px; }
          .metric-unit { font-size: 10px; color: #9ca3af; font-weight: 400; }
          .los-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 12px; }
          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${printContents}</body>
      </html>
    `)
    w.document.close()
    w.print()
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="report-overlay" id="report-generator">
      <div className="report-panel">
        {/* Header */}
        <div className="report__header">
          <span className="report__title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            </svg>
            Engineering Report
          </span>
          <div className="report__header-actions">
            <button className="report__print-btn" onClick={handlePrint} disabled={!result}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / PDF
            </button>
            <button className="report__close" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="report__body">
          {!result ? (
            <div className="report__empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              </svg>
              <p>Configure traffic inputs, create a signal plan, and assign approaches to phases to generate an engineering report.</p>
            </div>
          ) : (
            <div className="report__content" ref={reportRef}>
              {/* Title Block */}
              <h1>Traffic Signal Design Report</h1>
              <p className="report-header-sub">Intersection Performance Analysis & Engineering Summary</p>
              <div className="report-meta">
                <span>📍 {locationName}</span>
                <span>📐 Method: {method.toUpperCase()}</span>
                <span>📅 {dateStr} — {timeStr}</span>
              </div>

              {/* 1. Signal Timing Summary */}
              <h2>1. Signal Timing Summary</h2>
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-label">Cycle Length</div>
                  <div className="metric-value">{result.actualCycleLength}<span className="metric-unit"> sec</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Webster Optimum</div>
                  <div className="metric-value">{result.websterOptimumCycle}<span className="metric-unit"> sec</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Total Lost Time</div>
                  <div className="metric-value">{result.totalLostTime}<span className="metric-unit"> sec</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Sum Flow Ratios (Y)</div>
                  <div className="metric-value">{result.sumFlowRatios}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Signal Efficiency</div>
                  <div className="metric-value">{result.signalEfficiency}<span className="metric-unit"> %</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Over-Saturated</div>
                  <div className="metric-value">{result.isOverSaturated ? '⚠ Yes' : '✓ No'}</div>
                </div>
              </div>

              {/* Phase Greens Table */}
              <h3>Recommended Phase Green Times</h3>
              <table>
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th>Green (s)</th>
                    <th>Flow Ratio (y)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.recommendedGreens.map((g) => (
                    <tr key={g.phaseId}>
                      <td>{g.phaseName}</td>
                      <td>{g.greenTime}</td>
                      <td>{g.flowRatio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 2. Per-Approach Performance */}
              <h2>2. Approach-Level Performance</h2>
              <table>
                <thead>
                  <tr>
                    <th>Approach</th>
                    <th>Volume (PCU/hr)</th>
                    <th>Sat. Flow</th>
                    <th>Capacity</th>
                    <th>v/c</th>
                    <th>g/C</th>
                    <th>Delay (s/veh)</th>
                    <th>Queue (veh)</th>
                    <th>Throughput</th>
                    <th>LOS</th>
                  </tr>
                </thead>
                <tbody>
                  {result.approaches.map((a) => (
                    <tr key={a.approachId}>
                      <td><strong>{a.approachName}</strong></td>
                      <td>{a.volume}</td>
                      <td>{a.saturationFlow}</td>
                      <td>{a.capacity}</td>
                      <td>{a.degreeOfSaturation}</td>
                      <td>{a.greenRatio}</td>
                      <td>{a.averageDelay}</td>
                      <td>{a.queueLength}</td>
                      <td>{a.throughput}</td>
                      <td>
                        <span className="los-badge" style={{ background: a.losColor + '22', color: a.losColor }}>
                          {a.losGrade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 3. Intersection-Level Results */}
              <h2>3. Intersection-Level Performance</h2>
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-label">Average Delay</div>
                  <div className="metric-value">{result.avgDelay}<span className="metric-unit"> s/veh</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Level of Service</div>
                  <div className="metric-value">
                    <span className="los-badge" style={{ background: result.overallLOSColor + '22', color: result.overallLOSColor }}>
                      LOS {result.overallLOS}
                    </span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Avg Queue Length</div>
                  <div className="metric-value">{result.avgQueueLength}<span className="metric-unit"> veh</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Total Throughput</div>
                  <div className="metric-value">{result.totalThroughput}<span className="metric-unit"> PCU/hr</span></div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Congestion Index (V/C)</div>
                  <div className="metric-value">
                    {result.congestionIndex}
                    <span className="metric-unit" style={{ color: result.congestionColor }}> — {result.congestionLabel}</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Practical Efficiency</div>
                  <div className="metric-value">{result.practicalEfficiency}<span className="metric-unit"> %</span></div>
                </div>
              </div>

              {/* 4. Input Data Summary */}
              <h2>4. Input Data Summary</h2>
              <table>
                <thead>
                  <tr>
                    <th>Approach</th>
                    <th>Direction</th>
                    <th>Lanes</th>
                    <th>Width (m)</th>
                    <th>Left %</th>
                    <th>Through %</th>
                    <th>Right %</th>
                    <th>PHF</th>
                  </tr>
                </thead>
                <tbody>
                  {approaches.filter((a) => result.approaches.some((ra) => ra.approachId === a.id)).map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.name}</strong></td>
                      <td>{a.direction}</td>
                      <td>{a.laneCount}</td>
                      <td>{a.laneWidth}</td>
                      <td>{a.leftTurnPct}%</td>
                      <td>{a.throughPct}%</td>
                      <td>{a.rightTurnPct}%</td>
                      <td>{a.peakHourFactor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="footer">
                <span>Generated by Phasor Studio — Traffic Design Analysis Platform</span>
                <span>Report generated: {dateStr} at {timeStr}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
