import { useState, useEffect, useCallback, useRef } from 'react'
import { Stage, Layer, Line } from 'react-konva'
import LaneLayer from './Lanelayer'
import VertexLayer from './VertexLayer'
import { useEditorStore } from '../store/editorStore'
import { useToolStore } from '../store/toolStore'
import { useMapStore } from '../store/mapStore'
import { createDefaultLane } from '../objects/Lane'
import type { GeoPoint } from '../types/Point'

/**
 * EditorCanvas sits as a transparent overlay over the Leaflet map.
 * 
 * Key design:
 * - The Konva Stage has NO independent pan/zoom — it's always at (0,0) scale 1.
 * - Lane points are stored as lat/lng (GeoPoint).
 * - On every Leaflet map move/zoom, `viewVersion` bumps → triggers re-render →
 *   LaneLayer converts lat/lng → screen pixels via map.latLngToContainerPoint().
 * - When the user draws, screen clicks are converted to lat/lng via
 *   map.containerPointToLatLng() before storing.
 */
export default function EditorCanvas() {
  const addLane = useEditorStore((s) => s.addLane)
  const selectLane = useEditorStore((s) => s.selectLane)
  const deleteLane = useEditorStore((s) => s.deleteLane)
  const activeTool = useToolStore((s) => s.activeTool)
  const mapInstance = useMapStore((s) => s.mapInstance)

  // Subscribe to viewVersion so we re-render when map moves
  useMapStore((s) => s.viewVersion)

  const [startGeo, setStartGeo] = useState<GeoPoint | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Convert a screen pixel to geographic coordinates
  const screenToGeo = useCallback(
    (screenX: number, screenY: number): GeoPoint | null => {
      if (!mapInstance) return null
      const L = (window as any).L
      const latlng = mapInstance.containerPointToLatLng(L.point(screenX, screenY))
      return { lat: latlng.lat, lng: latlng.lng }
    },
    [mapInstance]
  )

  // Convert a GeoPoint to screen pixel
  const geoToScreen = useCallback(
    (geo: GeoPoint): { x: number; y: number } | null => {
      if (!mapInstance) return null
      const L = (window as any).L
      const pt = mapInstance.latLngToContainerPoint(L.latLng(geo.lat, geo.lng))
      return { x: pt.x, y: pt.y }
    },
    [mapInstance]
  )

  const handleMouseMove = useCallback((e: any) => {
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    setMousePos({ x: pointer.x, y: pointer.y })
  }, [])

  const handleMouseDown = useCallback(
    (e: any) => {
      const clickedOnEmpty = e.target === e.target.getStage()

      if (activeTool === 'delete') return

      if (activeTool === 'select' && clickedOnEmpty) {
        selectLane(null)
        return
      }

      if (activeTool !== 'draw') return

      const stage = e.target.getStage()
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const geo = screenToGeo(pointer.x, pointer.y)
      if (!geo) return

      if (!startGeo) {
        setStartGeo(geo)
      } else {
        addLane(createDefaultLane(crypto.randomUUID(), [startGeo, geo]))
        setStartGeo(null)
      }
    },
    [activeTool, startGeo, screenToGeo, addLane, selectLane]
  )

  const handleLaneClick = useCallback(
    (laneId: string) => {
      if (activeTool === 'select') {
        selectLane(laneId)
      } else if (activeTool === 'delete') {
        deleteLane(laneId)
      }
    },
    [activeTool, selectLane, deleteLane]
  )

  // In pan mode, let clicks pass through to the Leaflet map
  const isCanvasInteractive = activeTool !== 'pan'

  // Preview line: convert startGeo to screen pixels for the dashed preview
  const startScreenPt = startGeo ? geoToScreen(startGeo) : null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: isCanvasInteractive ? 'auto' : 'none',
      }}
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        style={{
          cursor:
            activeTool === 'draw'
              ? 'crosshair'
              : activeTool === 'select'
              ? 'default'
              : activeTool === 'delete'
              ? 'not-allowed'
              : 'grab',
        }}
      >
        <LaneLayer
          onLaneClick={handleLaneClick}
          geoToScreen={geoToScreen}
        />
        <VertexLayer geoToScreen={geoToScreen} screenToGeo={screenToGeo} />

        {/* Draw preview line */}
        {startScreenPt && activeTool === 'draw' && (
          <Layer>
            <Line
              points={[startScreenPt.x, startScreenPt.y, mousePos.x, mousePos.y]}
              stroke="#3b82f6"
              strokeWidth={8}
              dash={[10, 10]}
              lineCap="round"
              opacity={0.7}
            />
          </Layer>
        )}
      </Stage>
    </div>
  )
}