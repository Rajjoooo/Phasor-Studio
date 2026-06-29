export type ApproachDirection = 'north' | 'south' | 'east' | 'west' | 'custom'

export type VehicleComposition = {
  car: number
  bus: number
  truck: number
  lcv: number
  two_wheeler: number
  auto_rickshaw: number
  bicycle: number
}

export const DEFAULT_COMPOSITION: VehicleComposition = {
  car: 0,
  bus: 0,
  truck: 0,
  lcv: 0,
  two_wheeler: 0,
  auto_rickshaw: 0,
  bicycle: 0,
}

export type Approach = {
  id: string
  name: string                          // "North", "South", "East", "West", etc.
  direction: ApproachDirection
  lanes: string[]                       // lane IDs belonging to this approach
  totalVolume: number                   // sum of lane volumes (PCU/hr) — auto-calculated
  criticalFlowRatio: number             // y = totalVolume / saturationFlow — auto-calculated

  // Traffic input fields
  trafficVolume: number                 // veh/hr (raw, before PCU conversion)
  leftTurnPct: number                   // 0-100
  throughPct: number                    // 0-100
  rightTurnPct: number                  // 0-100
  peakHourFactor: number                // 0.0-1.0
  vehicleComposition: VehicleComposition
  saturationFlow: number                // PCU/hr
  laneWidth: number                     // metres
  laneCount: number                     // number of lanes

  // Derived (auto-calculated)
  pcuVolume: number                     // PCU/hr after conversion
  leftTurnVolume: number                // PCU/hr
  throughVolume: number                 // PCU/hr
  rightTurnVolume: number               // PCU/hr
}

export function createDefaultApproach(id: string, name: string, direction: ApproachDirection = 'custom'): Approach {
  return {
    id,
    name,
    direction,
    lanes: [],
    totalVolume: 0,
    criticalFlowRatio: 0,

    trafficVolume: 0,
    leftTurnPct: 10,
    throughPct: 70,
    rightTurnPct: 20,
    peakHourFactor: 0.92,
    vehicleComposition: { ...DEFAULT_COMPOSITION },
    saturationFlow: 1800,
    laneWidth: 3.5,
    laneCount: 2,

    pcuVolume: 0,
    leftTurnVolume: 0,
    throughVolume: 0,
    rightTurnVolume: 0,
  }
}
