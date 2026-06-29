/**
 * Webster's Method Calculator
 * Reference: F.V. Webster (1958) — "Traffic Signal Settings"
 * Also referenced in IRC:93-1985
 *
 * Pure functions — no side-effects.
 */

// ───────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────

export type WebsterApproachInput = {
  approachId: string
  approachName: string
  volume: number              // PCU/hr
  saturationFlow: number      // PCU/hr
  phaseId: string
}

export type WebsterPhaseInput = {
  phaseId: string
  phaseName: string
  greenTime: number           // seconds (user-defined or to be calculated)
  amberTime: number           // seconds
  allRedTime: number          // seconds
  /** The highest-volume approach assigned to this phase */
  criticalVolume: number      // PCU/hr
  criticalSatFlow: number     // PCU/hr
}

export type WebsterRecommendation = {
  recommendedCycle: number          // seconds (rounded)
  rawOptimumCycle: number           // seconds (exact)
  totalLostTime: number             // seconds
  sumFlowRatios: number             // Y
  isOverSaturated: boolean          // Y >= 1.0
  recommendedGreens: {
    phaseId: string
    phaseName: string
    greenTime: number               // seconds
    effectiveGreen: number          // seconds
    flowRatio: number               // yi
    proportionOfGreen: number       // gi / totalEffectiveGreen
  }[]
}

// ───────────────────────────────────────────────────────
// 1. Critical Flow Ratio per Phase
// ───────────────────────────────────────────────────────

/**
 * yi = qi / si
 */
export function flowRatio(criticalVolume: number, criticalSatFlow: number): number {
  if (criticalSatFlow <= 0) return 0
  return criticalVolume / criticalSatFlow
}

// ───────────────────────────────────────────────────────
// 2. Sum of Critical Flow Ratios
// ───────────────────────────────────────────────────────

/**
 * Y = Σ yi
 */
export function sumFlowRatios(phases: WebsterPhaseInput[]): number {
  return phases.reduce((sum, p) => sum + flowRatio(p.criticalVolume, p.criticalSatFlow), 0)
}

// ───────────────────────────────────────────────────────
// 3. Total Lost Time
// ───────────────────────────────────────────────────────

/**
 * L = n × startUpLoss + Σ allRedTime
 * where n = number of phases, startUpLoss typically 2s
 */
export function totalLostTime(phases: WebsterPhaseInput[], startUpLossPerPhase: number = 2): number {
  const startUpTotal = phases.length * startUpLossPerPhase
  const allRedTotal = phases.reduce((sum, p) => sum + p.allRedTime, 0)
  return startUpTotal + allRedTotal
}

// ───────────────────────────────────────────────────────
// 4. Webster's Optimum Cycle Length
// ───────────────────────────────────────────────────────

/**
 * Co = (1.5L + 5) / (1 - Y)
 *
 * Returns Infinity if Y >= 1.0 (over-saturated)
 */
export function optimumCycleLength(lostTime: number, sumY: number): number {
  if (sumY >= 1.0) return Infinity
  if (sumY <= 0) return lostTime + 10  // practical minimum
  return (1.5 * lostTime + 5) / (1 - sumY)
}

// ───────────────────────────────────────────────────────
// 5. Green Time Allocation (Proportional Split)
// ───────────────────────────────────────────────────────

/**
 * gi = (yi / Y) × (Co - L)
 *
 * Allocates available green time proportionally based on flow ratios.
 * Enforces a minimum green of 7 seconds (pedestrian safety).
 */
export function allocateGreenTimes(
  phases: WebsterPhaseInput[],
  cycleLength: number,
  lostTime: number
): { phaseId: string; phaseName: string; greenTime: number; effectiveGreen: number; flowRatio: number; proportionOfGreen: number }[] {
  const sumY = sumFlowRatios(phases)
  const totalAvailableGreen = cycleLength - lostTime

  if (sumY <= 0 || totalAvailableGreen <= 0) {
    // Equal split fallback
    const equalGreen = Math.max(totalAvailableGreen / phases.length, 7)
    return phases.map((p) => ({
      phaseId: p.phaseId,
      phaseName: p.phaseName,
      greenTime: Math.round(equalGreen),
      effectiveGreen: Math.round(equalGreen),
      flowRatio: 0,
      proportionOfGreen: 1 / phases.length,
    }))
  }

  const MIN_GREEN = 7 // seconds — pedestrian minimum

  const raw = phases.map((p) => {
    const yi = flowRatio(p.criticalVolume, p.criticalSatFlow)
    const proportion = yi / sumY
    const green = proportion * totalAvailableGreen
    return {
      phaseId: p.phaseId,
      phaseName: p.phaseName,
      greenTime: Math.max(Math.round(green), MIN_GREEN),
      effectiveGreen: Math.max(Math.round(green), MIN_GREEN),
      flowRatio: Math.round(yi * 1000) / 1000,
      proportionOfGreen: Math.round(proportion * 1000) / 1000,
    }
  })

  return raw
}

// ───────────────────────────────────────────────────────
// 6. Master: Full Webster Recommendation
// ───────────────────────────────────────────────────────

export function websterRecommendation(
  phases: WebsterPhaseInput[],
  startUpLossPerPhase: number = 2,
  minCycle: number = 30,
  maxCycle: number = 180
): WebsterRecommendation {
  const L = totalLostTime(phases, startUpLossPerPhase)
  const Y = sumFlowRatios(phases)
  const rawCo = optimumCycleLength(L, Y)

  const isOverSaturated = Y >= 1.0
  const clampedCycle = isOverSaturated
    ? maxCycle
    : Math.min(Math.max(Math.round(rawCo), minCycle), maxCycle)

  const greens = allocateGreenTimes(phases, clampedCycle, L)

  return {
    recommendedCycle: clampedCycle,
    rawOptimumCycle: Math.round(rawCo * 10) / 10,
    totalLostTime: L,
    sumFlowRatios: Math.round(Y * 1000) / 1000,
    isOverSaturated,
    recommendedGreens: greens,
  }
}
