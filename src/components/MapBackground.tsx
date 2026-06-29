import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useMapStore } from '../store/mapStore'
import 'leaflet/dist/leaflet.css'

/**
 * Inner component that syncs the Leaflet map with mapStore.
 * - Stores the map instance so EditorCanvas can call latLngToContainerPoint
 * - Fires bumpViewVersion on every pan/zoom so Konva shapes re-render
 */
function MapController() {
  const center = useMapStore((s) => s.center)
  const zoom = useMapStore((s) => s.zoom)
  const setMapInstance = useMapStore((s) => s.setMapInstance)
  const bumpViewVersion = useMapStore((s) => s.bumpViewVersion)
  const map = useMap()
  const isFirstRender = useRef(true)

  // Store the Leaflet map instance on mount
  useEffect(() => {
    setMapInstance(map)

    // Listen to all map move/zoom events and trigger canvas re-renders
    const handleViewChange = () => bumpViewVersion()
    map.on('move', handleViewChange)
    map.on('zoom', handleViewChange)
    map.on('moveend', handleViewChange)
    map.on('zoomend', handleViewChange)
    map.on('resize', handleViewChange)

    return () => {
      map.off('move', handleViewChange)
      map.off('zoom', handleViewChange)
      map.off('moveend', handleViewChange)
      map.off('zoomend', handleViewChange)
      map.off('resize', handleViewChange)
    }
  }, [map, setMapInstance, bumpViewVersion])

  // Fly to new location when center/zoom change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      map.setView(center, zoom)
      return
    }
    map.flyTo(center, zoom, { duration: 1.5 })
  }, [center, zoom, map])

  return null
}

export default function MapBackground() {
  const center = useMapStore((s) => s.center)
  const zoom = useMapStore((s) => s.zoom)

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={true}
      attributionControl={true}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    >
      {/* CartoDB Dark Matter tiles for dark theme */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        maxZoom={20}
      />
      <MapController />
    </MapContainer>
  )
}
