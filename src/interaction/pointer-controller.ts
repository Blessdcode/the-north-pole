/**
 * Pointer / touch exploration input.
 *
 * Mouse: the pointer's position relative to the viewport centre sets a look
 * offset (normalised -1…1). Touch: horizontal drags pan the view (vertical
 * swipes remain native scrolling for the story) and the view drifts home on
 * release. Values live in a mutable object read by the camera rig each frame.
 */
export const pointer = {
  x: 0,
  y: 0,
  /** Whether the camera should currently accept exploration input. */
  enabled: true,
}

export function attachPointerController() {
  let touchStartX = 0
  let touchStartY = 0
  let touchBaseX = 0
  let horizontalDrag = false
  let releaseTimer = 0

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1
  }
  const onPointerLeave = () => {
    pointer.x = 0
    pointer.y = 0
  }
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    touchStartX = t.clientX
    touchStartY = t.clientY
    touchBaseX = pointer.x
    horizontalDrag = false
    window.clearTimeout(releaseTimer)
  }
  const onTouchMove = (e: TouchEvent) => {
    const t = e.touches[0]
    const dx = t.clientX - touchStartX
    const dy = t.clientY - touchStartY
    if (!horizontalDrag && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) horizontalDrag = true
    if (horizontalDrag) {
      pointer.x = Math.max(-1, Math.min(1, touchBaseX - (dx / window.innerWidth) * 2.4))
    }
  }
  const onTouchEnd = () => {
    // Let the view settle back toward the composed shot after a moment.
    releaseTimer = window.setTimeout(() => {
      pointer.x = 0
      pointer.y = 0
    }, 1800)
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onPointerLeave)
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })

  return () => {
    window.clearTimeout(releaseTimer)
    window.removeEventListener('pointermove', onPointerMove)
    document.documentElement.removeEventListener('pointerleave', onPointerLeave)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
  }
}
