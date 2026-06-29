import { Layer, Line, Shape, Text, Group } from 'react-konva'
import { useEditorStore } from '../store/editorStore'
import { useToolStore } from '../store/toolStore'
import { useMapStore } from '../store/mapStore'
import type { GeoPoint } from '../types/Point'

type LaneLayerProps = {
  onLaneClick?: (laneId: string) => void
  geoToScreen: (geo: GeoPoint) => { x: number; y: number } | null
}

// Color palette for approach grouping
const APPROACH_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
]

/**
 * Compute the pixel width for a road based on its lane count.
 * Uses the map zoom level to make lane width scale geographically.
 */
function getPixelWidth(laneCount: number, widthMetres: number, zoom: number): number {
  // At zoom 17, ~1.2m ≈ 1px. Scale exponentially with zoom.
  const metresToPixel = Math.pow(2, zoom - 17) * 0.83
  return laneCount * widthMetres * metresToPixel
}

/**
 * Build the offset polygon (road surface) around a center polyline.
 * Returns flat [x, y, ...] array for a closed polygon.
 */
function buildRoadPolygon(
  screenPoints: { x: number; y: number }[],
  halfWidth: number
): number[] {
  if (screenPoints.length < 2) return []

  const left: { x: number; y: number }[] = []
  const right: { x: number; y: number }[] = []

  for (let i = 0; i < screenPoints.length - 1; i++) {
    const p1 = screenPoints[i]
    const p2 = screenPoints[i + 1]
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    // Perpendicular unit vector
    const nx = -dy / len
    const ny = dx / len

    if (i === 0) {
      left.push({ x: p1.x + nx * halfWidth, y: p1.y + ny * halfWidth })
      right.push({ x: p1.x - nx * halfWidth, y: p1.y - ny * halfWidth })
    }
    left.push({ x: p2.x + nx * halfWidth, y: p2.y + ny * halfWidth })
    right.push({ x: p2.x - nx * halfWidth, y: p2.y - ny * halfWidth })
  }

  // Close the polygon: left edge forward, right edge backward
  const poly = [...left, ...right.reverse()]
  return poly.flatMap((p) => [p.x, p.y])
}

/**
 * Build a direction arrow along the road center.
 */
function buildDirectionArrow(
  screenPoints: { x: number; y: number }[],
  direction: 'inbound' | 'outbound'
): { points: number[]; arrowHead: number[] } | null {
  if (screenPoints.length < 2) return null

  const pts = direction === 'outbound' ? [...screenPoints].reverse() : screenPoints

  // Arrow along the center at 60% of the road length
  const p0 = pts[0]
  const p1 = pts[pts.length - 1]
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1

  const mid = { x: p0.x + dx * 0.5, y: p0.y + dy * 0.5 }
  const tip = { x: p0.x + dx * 0.7, y: p0.y + dy * 0.7 }

  // Arrow head
  const ux = dx / len
  const uy = dy / len
  const arrowSize = Math.min(12, len * 0.15)

  const headLeft = {
    x: tip.x - ux * arrowSize + uy * arrowSize * 0.6,
    y: tip.y - uy * arrowSize - ux * arrowSize * 0.6,
  }
  const headRight = {
    x: tip.x - ux * arrowSize - uy * arrowSize * 0.6,
    y: tip.y - uy * arrowSize + ux * arrowSize * 0.6,
  }

  return {
    points: [mid.x, mid.y, tip.x, tip.y],
    arrowHead: [headLeft.x, headLeft.y, tip.x, tip.y, headRight.x, headRight.y],
  }
}

export default function LaneLayer({ onLaneClick, geoToScreen }: LaneLayerProps) {
  const lanes = useEditorStore((s) => s.lanes)
  const approaches = useEditorStore((s) => s.approaches)
  const selectedLaneId = useEditorStore((s) => s.selectedLaneId)
  const selectLane = useEditorStore((s) => s.selectLane)
  const activeTool = useToolStore((s) => s.activeTool)
  const mapInstance = useMapStore((s) => s.mapInstance)

  // Subscribe to viewVersion to re-render when map moves
  useMapStore((s) => s.viewVersion)

  const zoom = mapInstance?.getZoom() ?? 17

  // Find approach index for color assignment
  const getApproachColor = (laneId: string): string => {
    const idx = approaches.findIndex((a) => a.lanes.includes(laneId))
    if (idx === -1) return '#facc15'
    return APPROACH_COLORS[idx % APPROACH_COLORS.length]
  }

  return (
    <Layer>
      {lanes.map((lane) => {
        // Convert all geo points to screen pixels
        const screenPoints = lane.points
          .map((gp) => geoToScreen(gp))
          .filter((p): p is { x: number; y: number } => p !== null)

        if (screenPoints.length < 2) return null

        const isSelected = lane.id === selectedLaneId
        const accentColor = isSelected ? '#22d3ee' : getApproachColor(lane.id)

        // Road dimensions
        const roadPixelWidth = getPixelWidth(lane.laneCount, lane.widthMetres, zoom)
        const halfWidth = roadPixelWidth / 2

        // Build the road surface polygon
        const roadPoly = buildRoadPolygon(screenPoints, halfWidth)

        // Center line points
        const centerFlat = screenPoints.flatMap((p) => [p.x, p.y])

        // Direction arrow
        const arrow = buildDirectionArrow(screenPoints, lane.direction)

        // Midpoint for labels
        const midX = (screenPoints[0].x + screenPoints[screenPoints.length - 1].x) / 2
        const midY = (screenPoints[0].y + screenPoints[screenPoints.length - 1].y) / 2

        return (
          <Group key={lane.id}>
            {/* ── Road surface (asphalt polygon) ── */}
            <Line
              points={roadPoly}
              closed
              fill={isSelected ? '#1e293b' : '#1a1a2e'}
              stroke={isSelected ? accentColor : 'rgba(255,255,255,0.12)'}
              strokeWidth={isSelected ? 2 : 1}
              opacity={0.92}
              onClick={() => {
                if (onLaneClick) onLaneClick(lane.id)
                else if (activeTool === 'select') selectLane(lane.id)
              }}
              hitStrokeWidth={Math.max(20, roadPixelWidth)}
            />

            {/* ── Edge lines (solid white) ── */}
            {(() => {
              const p1 = screenPoints[0]
              const p2 = screenPoints[screenPoints.length - 1]
              const dx = p2.x - p1.x
              const dy = p2.y - p1.y
              const len = Math.sqrt(dx * dx + dy * dy) || 1
              const nx = -dy / len
              const ny = dx / len
              return (
                <>
                  <Line
                    points={[
                      p1.x + nx * halfWidth, p1.y + ny * halfWidth,
                      p2.x + nx * halfWidth, p2.y + ny * halfWidth,
                    ]}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={1.5}
                    listening={false}
                  />
                  <Line
                    points={[
                      p1.x - nx * halfWidth, p1.y - ny * halfWidth,
                      p2.x - nx * halfWidth, p2.y - ny * halfWidth,
                    ]}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={1.5}
                    listening={false}
                  />
                </>
              )
            })()}

            {/* ── Center dashed line (lane marking) ── */}
            {lane.laneCount > 1 && (
              <Line
                points={centerFlat}
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={1}
                dash={[8, 8]}
                listening={false}
              />
            )}

            {/* ── Direction arrow on road ── */}
            {arrow && (
              <>
                <Line
                  points={arrow.points}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={2}
                  listening={false}
                />
                <Line
                  points={arrow.arrowHead}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={2}
                  lineJoin="round"
                  listening={false}
                />
              </>
            )}

            {/* ── Accent glow when selected ── */}
            {isSelected && (
              <Line
                points={roadPoly}
                closed
                stroke={accentColor}
                strokeWidth={2}
                opacity={0.4}
                dash={[6, 4]}
                listening={false}
              />
            )}

            {/* ── Approach name label ── */}
            {lane.approachName && (
              <Text
                x={midX - 30}
                y={midY - halfWidth - 18}
                text={`${lane.approachName} ${lane.direction === 'inbound' ? '→' : '←'}`}
                fontSize={11}
                fontFamily="Inter, sans-serif"
                fontStyle="bold"
                fill="white"
                opacity={0.85}
                listening={false}
              />
            )}

            {/* ── Volume label ── */}
            {lane.trafficVolume > 0 && (
              <Text
                x={midX - 30}
                y={midY - halfWidth - 6}
                text={`${lane.trafficVolume} PCU/hr`}
                fontSize={9}
                fontFamily="JetBrains Mono, monospace"
                fill={accentColor}
                opacity={0.75}
                listening={false}
              />
            )}
          </Group>
        )
      })}
    </Layer>
  )
}