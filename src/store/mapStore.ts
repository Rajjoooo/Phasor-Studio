import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type L from 'leaflet'

type MapStore = {
  center: [number, number]
  zoom: number
  locationName: string
  isLocationSet: boolean

  /** Live Leaflet map instance for coordinate conversion */
  mapInstance: L.Map | null

  /** Incremented on every map move/zoom to trigger canvas re-render */
  viewVersion: number

  setLocation: (lat: number, lng: number, zoom: number, name: string) => void
  resetLocation: () => void
  setMapInstance: (map: L.Map) => void
  bumpViewVersion: () => void
}

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      center: [28.6139, 77.209],  // Default: New Delhi
      zoom: 17,
      locationName: '',
      isLocationSet: false,
      mapInstance: null,
      viewVersion: 0,

      setLocation: (lat, lng, zoom, name) =>
        set({
          center: [lat, lng],
          zoom,
          locationName: name,
          isLocationSet: true,
        }),

      resetLocation: () =>
        set({
          center: [28.6139, 77.209],
          zoom: 17,
          locationName: '',
          isLocationSet: false,
          mapInstance: null,
          viewVersion: 0,
        }),

      setMapInstance: (map) => set({ mapInstance: map }),

      bumpViewVersion: () => set((s) => ({ viewVersion: s.viewVersion + 1 })),
    }),
    {
      name: 'phasor-map',
      partialize: (state) => ({
        center: state.center,
        zoom: state.zoom,
        locationName: state.locationName,
        isLocationSet: state.isLocationSet,
      }),
    }
  )
)
