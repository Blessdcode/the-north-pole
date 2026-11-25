import { Vector3 } from 'three'

/**
 * World-space hotspot anchors, projected to screen space each frame by
 * <HotspotProjector/> inside the canvas. DOM buttons read the projected
 * coordinates directly (no React renders per frame). World entities may move
 * their anchor (e.g. the hero gift) by writing `world`.
 */
export interface HotspotAnchor {
  id: string
  world: Vector3
  x: number
  y: number
  onScreen: boolean
}

const anchor = (id: string, x = 0, y = 0, z = 0): HotspotAnchor => ({ id, world: new Vector3(x, y, z), x: 0, y: 0, onScreen: false })

export const hotspotAnchors = {
  clock: anchor('clock', 0, 68, 9),
  machine: anchor('machine'),
  gift: anchor('gift'),
  reindeer: anchor('reindeer'),
  sleigh: anchor('sleigh'),
} satisfies Record<string, HotspotAnchor>

export type HotspotId = keyof typeof hotspotAnchors
