/**
 * Performance Analysis Engine
 *
 * Unified module that takes intersection configuration + signal plan
 * and computes all performance metrics using the selected design method.
 *
 * Pure functions — no side-effects.
 */

import type { DesignMethod } from '../store/projectStore'
import { getLOSFromDelay, getCongestionLevel } from '../constants/losThresholds'
import type { LOSGrade } from '../constants/losThresholds'
import {
  type WebsterPhaseInput,
  websterRecommendation,
} from './websterCalculator'
import {
  ircRecommendation,
  type IRCConfig,
} from './ircCalculator'

// ───────────────────────────────────────────────────────
// Input Types
// ───────────────────────────────────────────────────────

export type AnalysisApproach = {
  approachId: string
  approachName: string
  direction: 'north' | 'south' | 'east' | 'west' | 'custom'
  volume: number              // PCU/hr (after PHF and PCU conversion)
  saturationFlow: number      // PCU/hr (possibly IRC-adjusted)
  laneCount: number
  laneWidth: number           // metres
  leftTurnPct: number         // 0-100
  throughPct: number          // 0-100
  rightTurnPct: number        // 0-100
  peakHourFactor: number      // 0.0-1.0
  phaseId: string             // which phase serves this approach
}

export type AnalysisSignalPlan = {
  phases: WebsterPhaseInput[]
  cycleLength: number         // user-defined or auto-calc
  isAutoCalc: boolean
  lostTimePerPhase: number
}

export type AnalysisConfig = {
  method: DesignMethod
  ircConfig?: Partial<IRCConfig>
}

// ───────────────────────────────────────────────────────
// Output Types
// ───────────────────────────────────────────────────────

export type ApproachPerformance = {
  approachId: string
  approachName: string
  direction: string
  volume: number
  saturationFlow: number
  capacity: number
  degreeOfSaturation: number    // x = v/c
  greenRatio: number            // λ = g/C
  uniformDelay: number          // d1 (sec/veh)
  overflowDelay: number         // d2 (sec/veh)
  averageDelay: number          // 0.9 × (d1 + d2)
  queueLength: number           // vehicles
  queueLengthMeters: number     // meters (6m/veh)
  throughput: number            // effective PCU/hr
  losGrade: LOSGrade
  losLabel: string
  losColor: string
}

export type IntersectionPerformance = {
  // Method info
  method: DesignMethod

  // Signal timing
  websterOptimumCycle: number
  actualCycleLength: number
  totalLostTime: number
  sumFlowRatios: number
  isOverSaturated: boolean

  // Recommended greens (from optimizer)
  recommendedGreens: {
    phaseId: string
    phaseName: string
    greenTime: number
    flowRatio: number
  }[]

  // Per-approach results
  approaches: ApproachPerformance[]

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
  signalEfficiency: number
  practicalEfficiency: number
}

// ───────────────────────────────────────────────────────
// Core Delay Formulas (shared by all methods)
// ───────────────────────────────────────────────────────

/** d1 = C(1 - λ)² / 2(1 - λx) */
function calcUniformDelay(cycleLength: number, greenRatio: number, x: number): number {
  if (cycleLength <= 0) return 0
  const lambda = Math.min(greenRatio, 0.99)
  const xc = Math.min(x, 0.99)
  const denom = 2 * (1 - lambda * xc)
  if (denom <= 0) return cycleLength / 2
  return (cycleLength * Math.pow(1 - lambda, 2)) / denom
}

/** d2 = x² / 2q(1 - x) */
function calcOverflowDelay(x: number, flowPerSec: number): number {
  if (flowPerSec <= 0) return 0
  const xc = Math.min(x, 0.99)
  const denom = 2 * flowPerSec * (1 - xc)
  if (denom <= 0) return 0
  return (xc * xc) / denom
}

/** c = s × (g / C) */
function calcCapacity(satFlow: number, greenTime: number, cycleLength: number): number {
  if (cycleLength <= 0) return 0
  return satFlow * (greenTime / cycleLength)
}

// ───────────────────────────────────────────────────────
// Master: Analyze Intersection
// ───────────────────────────────────────────────────────

export function analyzeIntersection(
  approaches: AnalysisApproach[],
  signalPlan: AnalysisSignalPlan,
  config: AnalysisConfig
): IntersectionPerformance {
  const { method, ircConfig } = config
  const { phases, lostTimePerPhase, isAutoCalc } = signalPlan

  // 1. Get recommendation from the appropriate engine
  let recommendation = method === 'irc'
    ? ircRecommendation(phases, ircConfig, lostTimePerPhase)
    : websterRecommendation(phases, lostTimePerPhase)

  // 2. Determine actual cycle
  const actualCycle = isAutoCalc || method === 'custom'
    ? (isAutoCalc ? recommendation.recommendedCycle : signalPlan.cycleLength)
    : recommendation.recommendedCycle

  // For custom method, use user-defined cycle
  const effectiveCycle = method === 'custom'
    ? (signalPlan.cycleLength > 0 ? signalPlan.cycleLength : recommendation.recommendedCycle)
    : actualCycle

  // 3. Map green times: use recommended if auto-calc, else user-defined
  const greenMap = new Map<string, number>()
  if (isAutoCalc && method !== 'custom') {
    recommendation.recommendedGreens.forEach((g) => {
      greenMap.set(g.phaseId, g.greenTime)
    })
  } else {
    phases.forEach((p) => {
      greenMap.set(p.phaseId, p.greenTime)
    })
  }

  // 4. Compute per-approach performance
  const approachResults: ApproachPerformance[] = approaches.map((a) => {
    const g = greenMap.get(a.phaseId) ?? 0

    const greenRatio = effectiveCycle > 0 ? g / effectiveCycle : 0
    const cap = calcCapacity(a.saturationFlow, g, effectiveCycle)
    const x = cap > 0 ? a.volume / cap : 0
    const flowPerSec = a.volume / 3600

    const d1 = calcUniformDelay(effectiveCycle, greenRatio, x)
    const d2 = calcOverflowDelay(x, flowPerSec)
    const avgD = 0.9 * (d1 + d2)

    // Queue = arrival rate × red time
    const redTime = effectiveCycle - g
    const q = flowPerSec * redTime

    const los = getLOSFromDelay(avgD)

    return {
      approachId: a.approachId,
      approachName: a.approachName,
      direction: a.direction,
      volume: a.volume,
      saturationFlow: a.saturationFlow,
      capacity: Math.round(cap),
      degreeOfSaturation: Math.round(x * 1000) / 1000,
      greenRatio: Math.round(greenRatio * 1000) / 1000,
      uniformDelay: Math.round(d1 * 10) / 10,
      overflowDelay: Math.round(d2 * 10) / 10,
      averageDelay: Math.round(avgD * 10) / 10,
      queueLength: Math.round(q * 10) / 10,
      queueLengthMeters: Math.round(q * 6 * 10) / 10,
      throughput: Math.round(Math.min(a.volume, cap)),
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

  const weightedDelay = totalVolume > 0
    ? approachResults.reduce((s, a) => s + a.averageDelay * a.volume, 0) / totalVolume
    : 0
  const overallLos = getLOSFromDelay(weightedDelay)

  const avgQ = approachResults.length > 0
    ? approachResults.reduce((s, a) => s + a.queueLength, 0) / approachResults.length
    : 0

  const totalThroughput = approachResults.reduce((s, a) => s + a.throughput, 0)

  // Signal efficiency: η = (C - L) / C × 100
  const sigEff = effectiveCycle > 0
    ? ((effectiveCycle - recommendation.totalLostTime) / effectiveCycle) * 100
    : 0

  // Practical efficiency: Σ(gi × si) / (C × Σ(si)) × 100
  const practNum = approachResults.reduce((s, a) => s + a.greenRatio * effectiveCycle * a.saturationFlow, 0)
  const practDen = effectiveCycle * approachResults.reduce((s, a) => s + a.saturationFlow, 0)
  const practEff = practDen > 0 ? (practNum / practDen) * 100 : 0

  return {
    method,
    websterOptimumCycle: recommendation.rawOptimumCycle,
    actualCycleLength: effectiveCycle,
    totalLostTime: recommendation.totalLostTime,
    sumFlowRatios: recommendation.sumFlowRatios,
    isOverSaturated: recommendation.isOverSaturated,
    recommendedGreens: recommendation.recommendedGreens.map((g) => ({
      phaseId: g.phaseId,
      phaseName: g.phaseName,
      greenTime: g.greenTime,
      flowRatio: g.flowRatio,
    })),
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
  }
}
