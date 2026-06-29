import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DesignMethod = 'webster' | 'irc' | 'custom'

export type Project = {
  name: string
  location: string
  designMethod: DesignMethod
}

type ProjectStore = {
  project: Project | null
  isProjectReady: boolean
  setProject: (project: Project) => void
  resetProject: () => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      project: null,
      isProjectReady: false,

      setProject: (project) =>
        set({ project, isProjectReady: true }),

      resetProject: () =>
        set({ project: null, isProjectReady: false }),
    }),
    {
      name: 'phasor-project',
    }
  )
)
