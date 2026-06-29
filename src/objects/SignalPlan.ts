export type SignalPhase = {
  id: string
  name: string
  greenTime: number             // seconds
  amberTime: number             // seconds (default 3)
  allRedTime: number            // seconds (default 2)
  approachIds: string[]         // which approaches get green
}

export type SignalPlan = {
  id: string
  name: string
  phases: SignalPhase[]
  cycleLength: number           // auto-calculated or user-override
  lostTimePerPhase: number      // default 2 sec (start-up loss)
  isAutoCalc: boolean           // true = Webster's optimum, false = user-defined
}

export function createDefaultPhase(id: string, name: string): SignalPhase {
  return {
    id,
    name,
    greenTime: 30,
    amberTime: 3,
    allRedTime: 2,
    approachIds: [],
  }
}

export function createDefaultSignalPlan(id: string): SignalPlan {
  return {
    id,
    name: 'Signal Plan 1',
    phases: [],
    cycleLength: 0,
    lostTimePerPhase: 2,
    isAutoCalc: true,
  }
}
