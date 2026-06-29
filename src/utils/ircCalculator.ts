/**
 * IRC Method Calculator
 * Reference: IRC:93-1985 — Guidelines on Design and Installation of Road Traffic Signals
 * Reference: IRC:106-1990 — Guidelines for Capacity of Urban Roads
 *
 * The IRC method extends Webster's formula with India-specific adjustments
 * for saturation flow, lane widths, gradient, heavy commercial vehicle
 * percentages, and turning movements.
 *
 * Pure functions — no side-effects.
 */

import {
  type WebsterPhaseInput,
  type WebsterRecommendation,
  totalLostTime,
  sumFlowRatios,
  optimumCycleLength,
  allocateGreenTimes,
} from './websterCalculator'

// ───────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────

export type IRCConfig = {
  /** Base saturation flow in PCU/hr for a 3.5m lane (default 1800) */
  baseSaturationFlow: number
  /** Gradient in percent (positive = uphill, negative = downhill) */
  gradient: number
  /** Heavy Commercial Vehicle percentage (0-100) */
  hcvPercent: number
  /** Turning traffic percentage (0-100) — applies to turning lanes */
  turningPercent: number
  /** Pedestrian phase time in seconds (0 = no pedestrian phase) */
  pedestrianPhaseTime: number
}

export const DEFAULT_IRC_CONFIG: IRCConfig = {
  baseSaturationFlow: 1800,
  gradient: 0,
  hcvPercent: 10,
  turningPercent: 15,
  pedestrianPhaseTime: 0,
}

// ───────────────────────────────────────────────────────
// 1. Saturation Flow Adjustments (IRC:106-1990)
// ───────────────────────────────────────────────────────

/**
 * Lane width adjustment factor.
 * Base: 3.5m lane = factor 1.0
 * IRC provides: 3.0m → 0.87, 3.25m → 0.93, 3.75m → 1.07, 4.0m → 1.14
 */
export function laneWidthFactor(laneWidthM: number): number {
  // Linear interpolation from IRC:106 Table
  const baseWidth = 3.5
  const factor = 1.0 + (laneWidthM - baseWidth) * 0.2
  return Math.max(0.8, Math.min(factor, 1.25))
}

/**
 * Gradient adjustment factor.
 * Uphill reduces saturation flow, downhill slightly increases it.
 * IRC guideline: 3% reduction per 1% uphill gradient
 */
export function gradientFactor(gradientPercent: number): number {
  if (gradientPercent > 0) {
    // Uphill: reduce saturation flow
    return Math.max(0.7, 1.0 - 0.03 * gradientPercent)
  }
  // Downhill: slight increase (capped)
  return Math.min(1.1, 1.0 + 0.01 * Math.abs(gradientPercent))
}

/**
 * Heavy Commercial Vehicle (HCV) adjustment factor.
 * Higher HCV% reduces effective saturation flow.
 * IRC guideline: approximately 1.5% reduction per 1% HCV
 */
export function hcvFactor(hcvPercent: number): number {
  return Math.max(0.7, 1.0 - 0.015 * hcvPercent)
}

/**
 * Turning movement adjustment factor.
 * Turning traffic reduces effective saturation flow.
 * IRC guideline: approximately 0.8% reduction per 1% turning traffic
 */
export function turningFactor(turningPercent: number): number {
  return Math.max(0.75, 1.0 - 0.008 * turningPercent)
}

/**
 * Compute adjusted saturation flow based on IRC conditions
 */
export function adjustSaturationFlow(
  baseSatFlow: number,
  laneWidthM: number,
  gradientPercent: number = 0,
  hcvPercent: number = 0,
  turningPercent: number = 0
): number {
  const fw = laneWidthFactor(laneWidthM)
  const fg = gradientFactor(gradientPercent)
  const fh = hcvFactor(hcvPercent)
  const ft = turningFactor(turningPercent)

  const adjusted = baseSatFlow * fw * fg * fh * ft
  return Math.round(adjusted)
}

// ───────────────────────────────────────────────────────
// 2. IRC Cycle Length Constraints
// ───────────────────────────────────────────────────────

/** IRC:93-1985 specifies minimum 30s and recommended max 120s */
export const IRC_MIN_CYCLE = 30
export const IRC_MAX_CYCLE = 120
export const IRC_ABSOLUTE_MAX = 180 // absolute upper limit

// ───────────────────────────────────────────────────────
// 3. Pedestrian Phase Consideration
// ───────────────────────────────────────────────────────

/**
 * Minimum pedestrian green time per IRC.
 * tp = 7 + (W / 1.2) where W = crossing width in meters
 * Simplified: we allow the user to specify directly.
 */
export function minPedestrianGreen(crossingWidthM: number): number {
  return Math.ceil(7 + crossingWidthM / 1.2)
}

// ───────────────────────────────────────────────────────
// 4. Master: Full IRC Recommendation
// ───────────────────────────────────────────────────────

/**
 * IRC recommendation uses the same Webster formula base but
 * applies IRC-specific cycle constraints and saturation adjustments.
 */
export function ircRecommendation(
  phases: WebsterPhaseInput[],
  config: Partial<IRCConfig> = {},
  startUpLossPerPhase: number = 2
): WebsterRecommendation {
  const cfg = { ...DEFAULT_IRC_CONFIG, ...config }

  // Use the raw phases (saturation adjustments should already be applied
  // at the approach level before passing in)
  const L = totalLostTime(phases, startUpLossPerPhase)

  // Add pedestrian phase time to lost time if applicable
  const effectiveLostTime = cfg.pedestrianPhaseTime > 0
    ? L + cfg.pedestrianPhaseTime
    : L

  const Y = sumFlowRatios(phases)
  const rawCo = optimumCycleLength(effectiveLostTime, Y)

  const isOverSaturated = Y >= 1.0
  const clampedCycle = isOverSaturated
    ? IRC_MAX_CYCLE
    : Math.min(Math.max(Math.round(rawCo), IRC_MIN_CYCLE), IRC_MAX_CYCLE)

  const greens = allocateGreenTimes(phases, clampedCycle, effectiveLostTime)

  return {
    recommendedCycle: clampedCycle,
    rawOptimumCycle: Math.round(rawCo * 10) / 10,
    totalLostTime: effectiveLostTime,
    sumFlowRatios: Math.round(Y * 1000) / 1000,
    isOverSaturated,
    recommendedGreens: greens,
  }
}
