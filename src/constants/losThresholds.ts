/**
 * Level of Service thresholds per HCM 2010
 * Based on average control delay (seconds/vehicle)
 */
export type LOSGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export type LOSThreshold = {
  grade: LOSGrade
  maxDelay: number   // upper bound of delay (sec/veh), Infinity for F
  label: string
  color: string
  bgColor: string
  description: string
}

export const LOS_THRESHOLDS: LOSThreshold[] = [
  {
    grade: 'A',
    maxDelay: 10,
    label: 'Excellent',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    description: 'Free flow, negligible delay',
  },
  {
    grade: 'B',
    maxDelay: 20,
    label: 'Good',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.15)',
    description: 'Stable flow, slight delay',
  },
  {
    grade: 'C',
    maxDelay: 35,
    label: 'Acceptable',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.15)',
    description: 'Stable flow, acceptable delay',
  },
  {
    grade: 'D',
    maxDelay: 55,
    label: 'Tolerable',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    description: 'Approaching unstable flow',
  },
  {
    grade: 'E',
    maxDelay: 80,
    label: 'Poor',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    description: 'Unstable flow, significant delay',
  },
  {
    grade: 'F',
    maxDelay: Infinity,
    label: 'Failure',
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.15)',
    description: 'Forced/breakdown flow, excessive delay',
  },
]

/**
 * Determine LOS grade from average delay
 */
export function getLOSFromDelay(avgDelay: number): LOSThreshold {
  for (const threshold of LOS_THRESHOLDS) {
    if (avgDelay <= threshold.maxDelay) {
      return threshold
    }
  }
  return LOS_THRESHOLDS[LOS_THRESHOLDS.length - 1]
}

/**
 * Congestion level labels
 */
export type CongestionLevel = 'low' | 'moderate' | 'high' | 'severe'

export function getCongestionLevel(index: number): {
  level: CongestionLevel
  label: string
  color: string
} {
  if (index < 0.6) return { level: 'low', label: 'Low', color: '#10b981' }
  if (index < 0.8) return { level: 'moderate', label: 'Moderate', color: '#fbbf24' }
  if (index < 1.0) return { level: 'high', label: 'High', color: '#f59e0b' }
  return { level: 'severe', label: 'Severe', color: '#ef4444' }
}
