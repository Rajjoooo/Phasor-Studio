import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DesignMethod } from './projectStore'
import type { IntersectionPerformance } from '../utils/performanceAnalyzer'

export type Alternative = {
  id: string
  name: string
  designMethod: DesignMethod
  // Signal overrides
  cycleLength: number
  phaseGreens: Record<string, number>  // phaseId → greenTime
  // Analysis results (computed)
  results: IntersectionPerformance | null
}

type AlternativeStore = {
  alternatives: Alternative[]
  activeAlternativeId: string | null

  addAlternative: (alt: Alternative) => void
  removeAlternative: (id: string) => void
  duplicateAlternative: (id: string) => void
  setActiveAlternative: (id: string | null) => void
  updateAlternative: <K extends keyof Alternative>(id: string, key: K, value: Alternative[K]) => void
  setResults: (id: string, results: IntersectionPerformance) => void
  initDefaults: () => void
}

export const useAlternativeStore = create<AlternativeStore>()(
  persist(
    (set, get) => ({
  alternatives: [],
  activeAlternativeId: null,

  addAlternative: (alt) =>
    set((s) => ({
      alternatives: [...s.alternatives, alt],
      activeAlternativeId: s.activeAlternativeId || alt.id,
    })),

  removeAlternative: (id) =>
    set((s) => ({
      alternatives: s.alternatives.filter((a) => a.id !== id),
      activeAlternativeId: s.activeAlternativeId === id ? null : s.activeAlternativeId,
    })),

  duplicateAlternative: (id) => {
    const alt = get().alternatives.find((a) => a.id === id)
    if (!alt) return
    const newAlt: Alternative = {
      ...alt,
      id: crypto.randomUUID(),
      name: `${alt.name} (Copy)`,
      results: null,
    }
    set((s) => ({
      alternatives: [...s.alternatives, newAlt],
    }))
  },

  setActiveAlternative: (id) =>
    set({ activeAlternativeId: id }),

  updateAlternative: (id, key, value) =>
    set((s) => ({
      alternatives: s.alternatives.map((a) =>
        a.id === id ? { ...a, [key]: value } : a
      ),
    })),

  setResults: (id, results) =>
    set((s) => ({
      alternatives: s.alternatives.map((a) =>
        a.id === id ? { ...a, results } : a
      ),
    })),

  initDefaults: () => {
    if (get().alternatives.length > 0) return
    const defaults: Alternative[] = [
      { id: crypto.randomUUID(), name: 'Webster Design', designMethod: 'webster', cycleLength: 0, phaseGreens: {}, results: null },
      { id: crypto.randomUUID(), name: 'IRC Design', designMethod: 'irc', cycleLength: 0, phaseGreens: {}, results: null },
      { id: crypto.randomUUID(), name: 'Custom Design', designMethod: 'custom', cycleLength: 90, phaseGreens: {}, results: null },
    ]
    set({ alternatives: defaults, activeAlternativeId: defaults[0].id })
  },
    }),
    {
      name: 'phasor-alternatives',
    }
  )
)
