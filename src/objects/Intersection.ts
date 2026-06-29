import type { Point } from '../types/Point'

export type Intersection = {
  id: string
  name: string
  center: Point
  approaches: string[]          // approach IDs
  signalPlanId: string | null   // linked signal plan ID
}

export function createDefaultIntersection(
  id: string,
  center: Point
): Intersection {
  return {
    id,
    name: 'New Intersection',
    center,
    approaches: [],
    signalPlanId: null,
  }
}
