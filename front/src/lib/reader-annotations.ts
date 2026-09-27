export interface NoteAnchor { left: number; top: number; right: number; bottom: number }
export interface NoteMarker { ids: string[]; x: number; y: number }

/** Coordinates in the outer viewport, never in a chapter's full scroll height. */
export function visibleRangeRects(range: Range, bounds: DOMRect, offset = { x: 0, y: 0 }): NoteAnchor[] {
  return Array.from(range.getClientRects()).map(rect => ({ left: rect.left + offset.x, right: rect.right + offset.x, top: rect.top + offset.y, bottom: rect.bottom + offset.y }))
    .filter(rect => rect.right > bounds.left && rect.left < bounds.right && rect.bottom > bounds.top && rect.top < bounds.bottom && rect.right > rect.left)
    .map(rect => ({ left: Math.max(rect.left, bounds.left), right: Math.min(rect.right, bounds.right), top: Math.max(rect.top, bounds.top), bottom: Math.min(rect.bottom, bounds.bottom) }))
}

export function groupNoteMarkers(points: { id: string; x: number; y: number }[]): NoteMarker[] {
  const groups: NoteMarker[] = []
  for (const point of points.sort((a, b) => a.y - b.y)) {
    const previous = groups.find(group => Math.abs(group.y - point.y) < 26 && Math.abs(group.x - point.x) < 26)
    if (previous) previous.ids.push(point.id)
    else groups.push({ ids: [point.id], x: point.x, y: point.y })
  }
  return groups
}

export function visibleRangeAnchor(range: Range, bounds: DOMRect, offset = { x: 0, y: 0 }): NoteAnchor | null {
  return visibleRangeRects(range, bounds, offset).at(-1) ?? null
}
export function noteMarkerPoint(anchor: NoteAnchor, bounds: DOMRect) {
  return { x: Math.min(bounds.right - 12, anchor.right + 8), y: Math.max(bounds.top + 12, anchor.top - 4) }
}
