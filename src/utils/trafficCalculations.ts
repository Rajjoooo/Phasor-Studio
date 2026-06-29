/**
 * Traffic Engineering Calculations
 * Based on IRC:93-1985 (Webster's Method) and HCM 2010
 *
 * All formulas are pure functions — no side effects.
 */

import { getLOSFromDelay, getCongestionLevel } from '../constants/losThresholds'
import type { LOSGrade } from '../constants/losThresholds'

// ───────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────

export type PhaseInput = {
  phaseId: string
  phaseName: string
  greenTime: number        // seconds
  amberTime: number        // seconds
  allRedTime: number       // seconds
  /** Critical approach data for this phase */
  criticalVolume: number   // PCU/hr — the highest volume approach in this phase
  criticalSatFlow: number  // PCU/hr — saturation flow for that approach
}

export type ApproachResult = {
  approachId: string
  approachName: string
  volume: number           // PCU/hr
  saturationFlow: number   // PCU/hr
  capacity: number         // PCU/hr
  degreeOfSaturation: number  // x = v/c
  greenRatio: number       // λ = g/C
  uniformDelay: number     // d1 (sec/veh)
  overflowDelay: number    // d2 (sec/veh)
  averageDelay: number     // 0.9 × (d1 + d2)
  queueLength: number      // vehicles
  queueLengthMeters: number // meters (6m/veh)
  throughput: number       // PCU/hr (effective capacity)
  losGrade: LOSGrade
  losLabel: string
  losColor: string
}

export type IntersectionResult = {
  // Webster's optimum
  websterOptimumCycle: number
  actualCycleLength: number
  totalLostTime: number

  // Per-approach
  approaches: ApproachResult[]

  // Aggregate metrics
  avgDelay: number
  avgQueueLength: number
  totalThroughput: number
  congestionIndex: number
  congestionLabel: string
  congestionColor: string
  overallLOS: LOSGrade
  overallLOSLabel: string
  overallLOSColor: string
  signalEfficiency: number      // percentage
  practicalEfficiency: number   // percentage

  // Summary of Y
  sumFlowRatios: number
}

// ───────────────────────────────────────────────────────
// 1. Webster's Optimum Cycle Length (IRC:93-1985)
// ───────────────────────────────────────────────────────

/**
 * Co = (1.5L + 5) / (1 - Y)
 *
 * @param totalLostTime L — total lost time per cycle (seconds)
 * @param sumFlowRatios Y — sum of critical flow ratios (must be < 1.0)
 * @returns optimum cycle length in seconds, or Infinity if Y >= 1.0
 */
export function websterOptimumCycleLength(
  totalLostTime: number,
  sumFlowRatios: number
): number {
  if (sumFlowRatios >= 1.0) return Infinity
  if (sumFlowRatios <= 0) return totalLostTime + 10 // minimum practical
  return (1.5 * totalLostTime + 5) / (1 - sumFlowRatios)
}

// ───────────────────────────────────────────────────────
// 2. Total Lost Time
// ───────────────────────────────────────────────────────

/**
 * L = Σ(lostTimePerPhase) + Σ(allRedTime)
 */
export function calcTotalLostTime(phases: PhaseInput[], lostTimePerPhase: number): number {
  const startUpLoss = phases.length * lostTimePerPhase
  const allRedTotal = phases.reduce((sum, p) => sum + p.allRedTime, 0)
  return startUpLoss + allRedTotal
}

// ───────────────────────────────────────────────────────
// 3. Sum of Critical Flow Ratios
// ───────────────────────────────────────────────────────

/**
 * Y = Σ(yi) where yi = qi / si for the critical lane in each phase
 */
export function calcSumFlowRatios(phases: PhaseInput[]): number {
  return phases.reduce((sum, p) => {
    if (p.criticalSatFlow <= 0) return sum
    return sum + p.criticalVolume / p.criticalSatFlow
  }, 0)
}

// ───────────────────────────────────────────────────────
// 4. Uniform Delay (d1) — Webster
// ───────────────────────────────────────────────────────

/**
 * d1 = C(1 - λ)² / 2(1 - λx)
 *
 * @param cycleLength C (seconds)
 * @param greenRatio λ = g / C
 * @param degreeOfSaturation x = v / c
 */
export function uniformDelay(
  cycleLength: number,
  greenRatio: number,
  degreeOfSaturation: number
): number {
  if (cycleLength <= 0) return 0

  // Clamp x to avoid division by zero / negative
  const x = Math.min(degreeOfSaturation, 0.99)
  const lambda = Math.min(greenRatio, 0.99)

  const denominator = 2 * (1 - lambda * x)
  if (denominator <= 0) return cycleLength / 2 // fallback

  return (cycleLength * Math.pow(1 - lambda, 2)) / denominator
}

// ───────────────────────────────────────────────────────
// 5. Overflow Delay (d2) — Webster
// ───────────────────────────────────────────────────────

/**
 * d2 = x² / 2q(1 - x)
 *
 * @param degreeOfSaturation x = v / c
 * @param flowRatePerSec q = volume / 3600 (veh/sec)
 */
export function overflowDelay(
  degreeOfSaturation: number,
  flowRatePerSec: number
): number {
  if (flowRatePerSec <= 0) return 0

  const x = Math.min(degreeOfSaturation, 0.99)
  const denominator = 2 * flowRatePerSec * (1 - x)
  if (denominator <= 0) return 0

  return (x * x) / denominator
}

// ───────────────────────────────────────────────────────
// 6. Average Delay — Webster (with 0.9 factor)
// ───────────────────────────────────────────────────────

export function averageDelay(d1: number, d2: number): number {
  return 0.9 * (d1 + d2)
}

// ───────────────────────────────────────────────────────
// 7. Queue Length
// ───────────────────────────────────────────────────────

/**
 * Qmax = q × r
 * where q = arrival rate (veh/sec), r = effective red time
 */
export function queueLength(
  volumePerHour: number,
  cycleLength: number,
  greenTime: number
): number {
  if (cycleLength <= 0) return 0
  const redTime = cycleLength - greenTime
  const arrivalRatePerSec = volumePerHour / 3600
  return arrivalRatePerSec * redTime
}

// ───────────────────────────────────────────────────────
// 8. Capacity per approach
// ───────────────────────────────────────────────────────

/**
 * c = s × (g / C)
 */
export function capacity(
  saturationFlow: number,
  greenTime: number,
  cycleLength: number
): number {
  if (cycleLength <= 0) return 0
  return saturationFlow * (greenTime / cycleLength)
}

// ───────────────────────────────────────────────────────
// 9. Congestion Index
// ───────────────────────────────────────────────────────

/**
 * CI = Σ(vi) / Σ(ci)
 */
export function congestionIndex(
  approaches: { volume: number; capacity: number }[]
): number {
  const totalVolume = approaches.reduce((s, a) => s + a.volume, 0)
  const totalCapacity = approaches.reduce((s, a) => s + a.capacity, 0)
  if (totalCapacity <= 0) return 0
  return totalVolume / totalCapacity
}

// ───────────────────────────────────────────────────────
// 10. Signal Efficiency
// ───────────────────────────────────────────────────────

/**
 * Basic: η = (C - L) / C × 100
 */
export function signalEfficiency(cycleLength: number, totalLostTime: number): number {
  if (cycleLength <= 0) return 0
  return ((cycleLength - totalLostTime) / cycleLength) * 100
}

/**
 * Practical: η_practical = Σ(gi × si) / (C × Σ(si)) × 100
 */
export function practicalEfficiency(
  phases: { greenTime: number; saturationFlow: number }[],
  cycleLength: number
): number {
  if (cycleLength <= 0) return 0
  const numerator = phases.reduce((s, p) => s + p.greenTime * p.saturationFlow, 0)
  const denominator = cycleLength * phases.reduce((s, p) => s + p.saturationFlow, 0)
  if (denominator <= 0) return 0
  return (numerator / denominator) * 100
}

// ───────────────────────────────────────────────────────
// MASTER: Calculate all intersection metrics
// ───────────────────────────────────────────────────────

export type ApproachInput = {
  approachId: string
  approachName: string
  volume: number          // PCU/hr
  saturationFlow: number  // PCU/hr
  phaseId: string
}

export function calculateIntersection(
  phases: PhaseInput[],
  approachInputs: ApproachInput[],
  lostTimePerPhase: number,
  userCycleLength?: number // if user overrides Webster's
): IntersectionResult {
  // 1. Total lost time
  const totalLostTime = calcTotalLostTime(phases, lostTimePerPhase)

  // 2. Sum of critical flow ratios
  const sumY = calcSumFlowRatios(phases)

  // 3. Webster's optimum cycle
  const websterOptimum = websterOptimumCycleLength(totalLostTime, sumY)
  const actualCycle = userCycleLength
    ? userCycleLength
    : Math.min(Math.max(Math.round(websterOptimum), 30), 180) // clamp 30-180s

  // 4. Per-approach results
  const approachResults: ApproachResult[] = approachInputs.map((ai) => {
    const phase = phases.find((p) => p.phaseId === ai.phaseId)
    const g = phase ? phase.greenTime : 0

    const greenRatio = actualCycle > 0 ? g / actualCycle : 0
    const cap = capacity(ai.saturationFlow, g, actualCycle)
    const x = cap > 0 ? ai.volume / cap : 0
    const flowPerSec = ai.volume / 3600

    const d1 = uniformDelay(actualCycle, greenRatio, x)
    const d2 = overflowDelay(x, flowPerSec)
    const avgD = averageDelay(d1, d2)
    const q = queueLength(ai.volume, actualCycle, g)
    const los = getLOSFromDelay(avgD)

    return {
      approachId: ai.approachId,
      approachName: ai.approachName,
      volume: ai.volume,
      saturationFlow: ai.saturationFlow,
      capacity: Math.round(cap),
      degreeOfSaturation: Math.round(x * 1000) / 1000,
      greenRatio: Math.round(greenRatio * 1000) / 1000,
      uniformDelay: Math.round(d1 * 10) / 10,
      overflowDelay: Math.round(d2 * 10) / 10,
      averageDelay: Math.round(avgD * 10) / 10,
      queueLength: Math.round(q * 10) / 10,
      queueLengthMeters: Math.round(q * 6 * 10) / 10, // 6m per vehicle
      throughput: Math.round(Math.min(ai.volume, cap)),
      losGrade: los.grade,
      losLabel: los.label,
      losColor: los.color,
    }
  })

  // 5. Aggregates
  const totalVolume = approachResults.reduce((s, a) => s + a.volume, 0)
  const totalCap = approachResults.reduce((s, a) => s + a.capacity, 0)
  const ci = totalCap > 0 ? totalVolume / totalCap : 0
  const congestion = getCongestionLevel(ci)

  // Weighted average delay
  const weightedDelay = totalVolume > 0
    ? approachResults.reduce((s, a) => s + a.averageDelay * a.volume, 0) / totalVolume
    : 0
  const overallLos = getLOSFromDelay(weightedDelay)

  const avgQ = approachResults.length > 0
    ? approachResults.reduce((s, a) => s + a.queueLength, 0) / approachResults.length
    : 0

  const totalThroughput = approachResults.reduce((s, a) => s + a.throughput, 0)

  const sigEff = signalEfficiency(actualCycle, totalLostTime)
  const practEff = practicalEfficiency(
    approachResults.map((a) => ({
      greenTime: a.greenRatio * actualCycle,
      saturationFlow: a.saturationFlow,
    })),
    actualCycle
  )

  return {
    websterOptimumCycle: Math.round(websterOptimum * 10) / 10,
    actualCycleLength: actualCycle,
    totalLostTime,
    approaches: approachResults,
    avgDelay: Math.round(weightedDelay * 10) / 10,
    avgQueueLength: Math.round(avgQ * 10) / 10,
    totalThroughput,
    congestionIndex: Math.round(ci * 1000) / 1000,
    congestionLabel: congestion.label,
    congestionColor: congestion.color,
    overallLOS: overallLos.grade,
    overallLOSLabel: overallLos.label,
    overallLOSColor: overallLos.color,
    signalEfficiency: Math.round(sigEff * 10) / 10,
    practicalEfficiency: Math.round(practEff * 10) / 10,
    sumFlowRatios: Math.round(sumY * 1000) / 1000,
  }
}
