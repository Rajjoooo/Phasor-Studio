import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Lane } from '../objects/Lane'
import type { Approach } from '../objects/Approach'
import type { Intersection } from '../objects/Intersection'
import type { GeoPoint } from '../types/Point'
import { vehiclesToPCU } from '../constants/pcuFactors'

type EditorStore = {
  lanes: Lane[]
  approaches: Approach[]
  intersections: Intersection[]
  selectedLaneId: string | null
  selectedApproachId: string | null
  selectedIntersectionId: string | null

  // Lane actions
  addLane: (lane: Lane) => void
  selectLane: (id: string | null) => void
  updateLane: (id: string, points: GeoPoint[]) => void
  updateLanePoint: (laneId: string, pointIndex: number, point: GeoPoint) => void
  updateLaneProperty: <K extends keyof Lane>(id: string, key: K, value: Lane[K]) => void
  deleteLane: (id: string) => void

  // Approach actions
  addApproach: (approach: Approach) => void
  selectApproach: (id: string | null) => void
  updateApproach: <K extends keyof Approach>(id: string, key: K, value: Approach[K]) => void
  addLaneToApproach: (approachId: string, laneId: string) => void
  removeLaneFromApproach: (approachId: string, laneId: string) => void
  deleteApproach: (id: string) => void

  // Intersection actions
  addIntersection: (intersection: Intersection) => void
  selectIntersection: (id: string | null) => void
  updateIntersection: <K extends keyof Intersection>(id: string, key: K, value: Intersection[K]) => void
  deleteIntersection: (id: string) => void

  // Recalculate approach aggregates
  recalcApproach: (approachId: string) => void
  recalcApproachFromInputs: (approachId: string) => void
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
  lanes: [],
  approaches: [],
  intersections: [],
  selectedLaneId: null,
  selectedApproachId: null,
  selectedIntersectionId: null,

  // ── Lane Actions ──────────────────────────────────
  addLane: (lane) =>
    set((state) => ({
      lanes: [...state.lanes, lane],
    })),

  selectLane: (id) =>
    set({ selectedLaneId: id }),

  updateLane: (id, points) =>
    set((state) => ({
      lanes: state.lanes.map((lane) =>
        lane.id === id ? { ...lane, points } : lane
      ),
    })),

  updateLanePoint: (laneId, pointIndex, point) =>
    set((state) => ({
      lanes: state.lanes.map((lane) => {
        if (lane.id !== laneId) return lane
        const updatedPoints = [...lane.points]
        updatedPoints[pointIndex] = point
        return { ...lane, points: updatedPoints }
      }),
    })),

  updateLaneProperty: (id, key, value) =>
    set((state) => ({
      lanes: state.lanes.map((lane) =>
        lane.id === id ? { ...lane, [key]: value } : lane
      ),
    })),

  deleteLane: (id) =>
    set((state) => ({
      lanes: state.lanes.filter((l) => l.id !== id),
      selectedLaneId: state.selectedLaneId === id ? null : state.selectedLaneId,
      // Also remove from any approach
      approaches: state.approaches.map((a) => ({
        ...a,
        lanes: a.lanes.filter((lId) => lId !== id),
      })),
    })),

  // ── Approach Actions ──────────────────────────────
  addApproach: (approach) =>
    set((state) => ({
      approaches: [...state.approaches, approach],
    })),

  selectApproach: (id) =>
    set({ selectedApproachId: id }),

  updateApproach: (id, key, value) =>
    set((state) => ({
      approaches: state.approaches.map((a) =>
        a.id === id ? { ...a, [key]: value } : a
      ),
    })),

  addLaneToApproach: (approachId, laneId) =>
    set((state) => ({
      approaches: state.approaches.map((a) =>
        a.id === approachId && !a.lanes.includes(laneId)
          ? { ...a, lanes: [...a.lanes, laneId] }
          : a
      ),
    })),

  removeLaneFromApproach: (approachId, laneId) =>
    set((state) => ({
      approaches: state.approaches.map((a) =>
        a.id === approachId
          ? { ...a, lanes: a.lanes.filter((id) => id !== laneId) }
          : a
      ),
    })),

  deleteApproach: (id) =>
    set((state) => ({
      approaches: state.approaches.filter((a) => a.id !== id),
      selectedApproachId: state.selectedApproachId === id ? null : state.selectedApproachId,
      // Remove approach from intersections
      intersections: state.intersections.map((i) => ({
        ...i,
        approaches: i.approaches.filter((aId) => aId !== id),
      })),
    })),

  // ── Intersection Actions ──────────────────────────
  addIntersection: (intersection) =>
    set((state) => ({
      intersections: [...state.intersections, intersection],
    })),

  selectIntersection: (id) =>
    set({ selectedIntersectionId: id }),

  updateIntersection: (id, key, value) =>
    set((state) => ({
      intersections: state.intersections.map((i) =>
        i.id === id ? { ...i, [key]: value } : i
      ),
    })),

  deleteIntersection: (id) =>
    set((state) => ({
      intersections: state.intersections.filter((i) => i.id !== id),
      selectedIntersectionId: state.selectedIntersectionId === id ? null : state.selectedIntersectionId,
    })),

  // ── Recalculate (legacy — from lane volumes) ──────
  recalcApproach: (approachId) => {
    const state = get()
    const approach = state.approaches.find((a) => a.id === approachId)
    if (!approach) return

    const approachLanes = state.lanes.filter((l) => approach.lanes.includes(l.id))
    const totalVolume = approachLanes.reduce((sum, l) => sum + l.trafficVolume, 0)
    const totalSatFlow = approachLanes.reduce((sum, l) => sum + l.saturationFlow, 0)
    const criticalFlowRatio = totalSatFlow > 0 ? totalVolume / totalSatFlow : 0

    set((s) => ({
      approaches: s.approaches.map((a) =>
        a.id === approachId
          ? { ...a, totalVolume, criticalFlowRatio }
          : a
      ),
    }))
  },

  // ── Recalculate from Traffic Inputs ────────────────
  recalcApproachFromInputs: (approachId) => {
    const state = get()
    const approach = state.approaches.find((a) => a.id === approachId)
    if (!approach) return

    // Convert vehicle composition to PCU volume
    const pcuFromComposition = vehiclesToPCU(approach.vehicleComposition)
    // Use composition if filled, otherwise use raw traffic volume
    const rawVolume = pcuFromComposition > 0 ? pcuFromComposition : approach.trafficVolume
    // Apply peak hour factor
    const pcuVolume = approach.peakHourFactor > 0
      ? Math.round(rawVolume / approach.peakHourFactor)
      : rawVolume

    // Derive turn volumes
    const leftTurnVolume = Math.round(pcuVolume * approach.leftTurnPct / 100)
    const throughVolume = Math.round(pcuVolume * approach.throughPct / 100)
    const rightTurnVolume = Math.round(pcuVolume * approach.rightTurnPct / 100)

    // Flow ratio
    const criticalFlowRatio = approach.saturationFlow > 0
      ? pcuVolume / approach.saturationFlow
      : 0

    set((s) => ({
      approaches: s.approaches.map((a) =>
        a.id === approachId
          ? {
              ...a,
              pcuVolume,
              totalVolume: pcuVolume,
              leftTurnVolume,
              throughVolume,
              rightTurnVolume,
              criticalFlowRatio: Math.round(criticalFlowRatio * 1000) / 1000,
            }
          : a
      ),
    }))
  },
    }),
    {
      name: 'phasor-editor',
    }
  )
)