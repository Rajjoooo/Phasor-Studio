import { Layer, Circle } from 'react-konva'
import { useEditorStore } from '../store/editorStore'
import { useToolStore } from '../store/toolStore'
import { useMapStore } from '../store/mapStore'
import type { GeoPoint } from '../types/Point'

type VertexLayerProps = {
  geoToScreen: (geo: GeoPoint) => { x: number; y: number } | null
  screenToGeo: (screenX: number, screenY: number) => GeoPoint | null
}

export default function VertexLayer({ geoToScreen, screenToGeo }: VertexLayerProps) {
  const lanes = useEditorStore((state) => state.lanes)
  const selectedLaneId = useEditorStore((state) => state.selectedLaneId)
  const updateLanePoint = useEditorStore((state) => state.updateLanePoint)
  const activeTool = useToolStore((state) => state.activeTool)

  // Subscribe to viewVersion so vertices re-render on map move
  useMapStore((s) => s.viewVersion)

  const selectedLane = lanes.find((lane) => lane.id === selectedLaneId)

  if (!selectedLane || activeTool !== 'vertex') return null

  return (
    <Layer>
      {selectedLane.points.map((geoPoint, index) => {
        const screenPt = geoToScreen(geoPoint)
        if (!screenPt) return null

        return (
          <Circle
            key={`${selectedLane.id}-${index}`}
            x={screenPt.x}
            y={screenPt.y}
            radius={8}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={2}
            draggable
            onDragMove={(e) => {
              const newScreenX = e.target.x()
              const newScreenY = e.target.y()
              const newGeo = screenToGeo(newScreenX, newScreenY)
              if (newGeo) {
                updateLanePoint(selectedLane.id, index, newGeo)
              }
            }}
            onDragEnd={(e) => {
              // Reset Konva position since we update the geo point directly
              const screenPtNow = geoToScreen(selectedLane.points[index])
              if (screenPtNow) {
                e.target.position({ x: screenPtNow.x, y: screenPtNow.y })
              }
            }}
          />
        )
      })}
    </Layer>
  )
}