/** Reconstruct centers in a centered flex row from its last measured geometry.
 * Gaps, padding and the divider stay fixed; only button widths animate.
 */
export function dockCenters(
  baseline: readonly { center: number; width: number }[],
  widths: readonly number[],
): number[] {
  const expansion = widths.reduce((total, width, index) => total + width - baseline[index].width, 0)
  let precedingExpansion = 0
  return baseline.map((item, index) => {
    const ownExpansion = widths[index] - item.width
    const center = item.center - expansion / 2 + precedingExpansion + ownExpansion / 2
    precedingExpansion += ownExpansion
    return center
  })
}
