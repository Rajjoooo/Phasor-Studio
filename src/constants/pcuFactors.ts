/**
 * IRC Standard PCU (Passenger Car Unit) equivalency factors
 * Reference: IRC:106-1990, IRC:93-1985
 */
export const PCU_FACTORS: Record<string, number> = {
  car: 1.0,
  bus: 3.0,
  truck: 3.0,
  lcv: 1.5,           // Light Commercial Vehicle
  two_wheeler: 0.5,
  auto_rickshaw: 1.0,
  bicycle: 0.2,
  pedestrian: 0.5,
  tractor: 4.5,
  hand_cart: 0.8,
}

export const PCU_LABELS: Record<string, string> = {
  car: 'Car / Jeep / Van',
  bus: 'Bus',
  truck: 'Truck',
  lcv: 'LCV',
  two_wheeler: 'Two Wheeler',
  auto_rickshaw: 'Auto Rickshaw',
  bicycle: 'Bicycle',
  pedestrian: 'Pedestrian',
  tractor: 'Tractor',
  hand_cart: 'Hand Cart',
}

/**
 * Convert raw vehicle counts to PCU
 */
export function vehiclesToPCU(counts: Record<string, number>): number {
  let total = 0
  for (const [type, count] of Object.entries(counts)) {
    const factor = PCU_FACTORS[type] ?? 1.0
    total += count * factor
  }
  return Math.round(total * 10) / 10
}
