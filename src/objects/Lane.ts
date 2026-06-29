import type { GeoPoint } from '../types/Point'

export type TurningMovement = 'left' | 'through' | 'right' | 'all'

export type Lane = {
  id: string
  /** Lane geometry stored as geographic coordinates for map sync */
  points: GeoPoint[]
  /** Visual width of the road in metres (default 3.5m per lane, standard IRC) */
  widthMetres: number
  direction: 'inbound' | 'outbound'
  approachName: string
  laneCount: number
  saturationFlow: number       // PCU/hr (default 1800)
  trafficVolume: number        // PCU/hr (user input)
  turningMovement: TurningMovement
  phaseId: string | null
  roadName: string
}

export function createDefaultLane(
  id: string,
  points: GeoPoint[],
  direction: 'inbound' | 'outbound' = 'inbound'
): Lane {
  return {
    id,
    points,
    widthMetres: 3.5,
    direction,
    approachName: '',
    laneCount: 1,
    saturationFlow: 1800,
    trafficVolume: 0,
    turningMovement: 'through',
    phaseId: null,
    roadName: '',
  }
}