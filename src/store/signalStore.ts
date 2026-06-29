import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SignalPlan, SignalPhase } from '../objects/SignalPlan'

type SignalStore = {
  signalPlans: SignalPlan[]
  activeSignalPlanId: string | null

  addSignalPlan: (plan: SignalPlan) => void
  removeSignalPlan: (id: string) => void
  setActiveSignalPlan: (id: string | null) => void
  updateSignalPlan: <K extends keyof SignalPlan>(id: string, key: K, value: SignalPlan[K]) => void

  addPhase: (planId: string, phase: SignalPhase) => void
  removePhase: (planId: string, phaseId: string) => void
  updatePhase: (planId: string, phaseId: string, updates: Partial<SignalPhase>) => void
  addApproachToPhase: (planId: string, phaseId: string, approachId: string) => void
  removeApproachFromPhase: (planId: string, phaseId: string, approachId: string) => void

  // Derived
  getActivePlan: () => SignalPlan | undefined
  recalcCycleLength: (planId: string) => void
}

export const useSignalStore = create<SignalStore>()(
  persist(
    (set, get) => ({
  signalPlans: [],
  activeSignalPlanId: null,

  addSignalPlan: (plan) =>
    set((s) => ({
      signalPlans: [...s.signalPlans, plan],
      activeSignalPlanId: s.activeSignalPlanId || plan.id,
    })),

  removeSignalPlan: (id) =>
    set((s) => ({
      signalPlans: s.signalPlans.filter((p) => p.id !== id),
      activeSignalPlanId: s.activeSignalPlanId === id ? null : s.activeSignalPlanId,
    })),

  setActiveSignalPlan: (id) =>
    set({ activeSignalPlanId: id }),

  updateSignalPlan: (id, key, value) =>
    set((s) => ({
      signalPlans: s.signalPlans.map((p) =>
        p.id === id ? { ...p, [key]: value } : p
      ),
    })),

  addPhase: (planId, phase) => {
    set((s) => ({
      signalPlans: s.signalPlans.map((p) =>
        p.id === planId ? { ...p, phases: [...p.phases, phase] } : p
      ),
    }))
    get().recalcCycleLength(planId)
  },

  removePhase: (planId, phaseId) => {
    set((s) => ({
      signalPlans: s.signalPlans.map((p) =>
        p.id === planId
          ? { ...p, phases: p.phases.filter((ph) => ph.id !== phaseId) }
          : p
      ),
    }))
    get().recalcCycleLength(planId)
  },

  updatePhase: (planId, phaseId, updates) => {
    set((s) => ({
      signalPlans: s.signalPlans.map((p) =>
        p.id === planId
          ? {
              ...p,
              phases: p.phases.map((ph) =>
                ph.id === phaseId ? { ...ph, ...updates } : ph
              ),
            }
          : p
      ),
    }))
    get().recalcCycleLength(planId)
  },

  addApproachToPhase: (planId, phaseId, approachId) =>
    set((s) => ({
      signalPlans: s.signalPlans.map((p) =>
        p.id === planId
          ? {
              ...p,
              phases: p.phases.map((ph) =>
                ph.id === phaseId && !ph.approachIds.includes(approachId)
                  ? { ...ph, approachIds: [...ph.approachIds, approachId] }
                  : ph
              ),
            }
          : p
      ),
    })),

  removeApproachFromPhase: (planId, phaseId, approachId) =>
    set((s) => ({
      signalPlans: s.signalPlans.map((p) =>
        p.id === planId
          ? {
              ...p,
              phases: p.phases.map((ph) =>
                ph.id === phaseId
                  ? { ...ph, approachIds: ph.approachIds.filter((id) => id !== approachId) }
                  : ph
              ),
            }
          : p
      ),
    })),

  getActivePlan: () => {
    const state = get()
    return state.signalPlans.find((p) => p.id === state.activeSignalPlanId)
  },

  recalcCycleLength: (planId) => {
    const plan = get().signalPlans.find((p) => p.id === planId)
    if (!plan || !plan.isAutoCalc) return

    const totalTime = plan.phases.reduce(
      (sum, ph) => sum + ph.greenTime + ph.amberTime + ph.allRedTime,
      0
    )
    set((s) => ({
      signalPlans: s.signalPlans.map((p) =>
        p.id === planId ? { ...p, cycleLength: totalTime } : p
      ),
    }))
  },
    }),
    {
      name: 'phasor-signal',
    }
  )
)
