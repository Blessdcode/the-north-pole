import { useLayoutEffect } from 'react'
import { Color, InstancedMesh, Matrix4, Object3D, Vector3 } from 'three'
import { mulberry32 } from '../../../lib/math'
import { generateHouses, houseLocalToWorld, type House, ROOF_RATIO } from './village-layout'

interface Placement {
  matrix: Matrix4
  color: Color
}

const BULB_COLORS = ['#ff3b30', '#2ee66b', '#ffcc33', '#4da3ff', '#ffffff'].map((c) => new Color(c))
const WARM_WHITE = new Color('#ffd59a')

/** Everything derived from the house list, computed once. */
export function buildVillageData(houses: House[]) {
  const rand = mulberry32(99)
  const o = new Object3D()
  const p = new Vector3()
  const windows: Placement[] = []
  const chimneys: Placement[] = []
  const bulbs: Placement[] = []
  const pools: Placement[] = []
  const chimneyTops: Vector3[] = []

  const place = (h: House, lx: number, ly: number, lz: number, yaw: number, sx: number, sy: number, sz = 1) => {
    houseLocalToWorld(h, lx, ly, lz, p)
    o.position.copy(p)
    o.rotation.set(0, h.rot + yaw, 0)
    o.scale.set(sx, sy, sz)
    o.updateMatrix()
    return o.matrix.clone()
  }

  const windowColor = () => {
    const r = rand()
    if (r < 0.12) return new Color('#3a2210').multiplyScalar(0.6) // dark room
    const k = 1.2 + rand() * 2.6
    return new Color(1, 0.78 + rand() * 0.1, 0.55 + rand() * 0.1).multiplyScalar(k)
  }

  for (const h of houses) {
    const floors = h.h > 8.2 ? 2 : 1
    const perRow = Math.max(1, Math.floor(h.w / 3.6))
    for (let f = 0; f < floors; f++) {
      const y = floors === 1 ? h.h * 0.45 : f === 0 ? h.h * 0.3 : h.h * 0.72
      for (let i = 0; i < perRow; i++) {
        const lx = ((i + 0.5) / perRow - 0.5) * h.w * 0.78
        if (f === 0 && perRow >= 3 && i === Math.floor(perRow / 2)) continue // the door
        windows.push({ matrix: place(h, lx, y, h.d / 2 + 0.06, 0, 1.25, 1.85), color: windowColor() })
        if (rand() < 0.6)
          windows.push({ matrix: place(h, -lx, y, -h.d / 2 - 0.06, Math.PI, 1.25, 1.85), color: windowColor() })
      }
      windows.push({ matrix: place(h, h.w / 2 + 0.06, y, 0, Math.PI / 2, 1.2, 1.8), color: windowColor() })
      windows.push({ matrix: place(h, -h.w / 2 - 0.06, y, 0, -Math.PI / 2, 1.2, 1.8), color: windowColor() })
    }
    // Attic window in the front gable.
    windows.push({ matrix: place(h, 0, h.h * (1 + ROOF_RATIO * 0.32), h.d / 2 + 0.06, 0, 1.0, 1.4), color: windowColor() })
    // Door: dim warm glow.
    windows.push({
      matrix: place(h, 0, 1.3, h.d / 2 + 0.05, 0, 1.5, 2.6),
      color: new Color(0.55, 0.3, 0.12),
    })

    // Chimney on one roof slope.
    const cx = h.w * (rand() < 0.5 ? 0.22 : -0.22)
    const roofY = h.h * (1 + ROOF_RATIO * (1 - (2 * Math.abs(cx)) / h.w))
    chimneys.push({
      matrix: place(h, cx, roofY - 1.2, -h.d * 0.2, 0, 1.3, 3.6 + rand() * 1.4, 1.3),
      color: new Color('#3b2620').multiplyScalar(0.8 + rand() * 0.4),
    })
    const top = houseLocalToWorld(h, cx, roofY - 1.2 + 4.8, -h.d * 0.2, new Vector3())
    if (rand() < 0.75) chimneyTops.push(top)

    // Christmas lights outlining the front gable.
    if (h.lights) {
      const multi = rand() < 0.55
      const steps = 9
      for (const side of [-1, 1]) {
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const lx = side * (h.w / 2 + 0.3) * (1 - t)
          const ly = h.h * (1 - 0.07) + t * h.h * (ROOF_RATIO + 0.1)
          const c = (multi ? BULB_COLORS[(i + (side > 0 ? 2 : 0)) % BULB_COLORS.length] : WARM_WHITE)
            .clone()
            .multiplyScalar(3.2)
          bulbs.push({ matrix: place(h, lx, ly, h.d / 2 + 0.45, 0, 0.22, 0.22, 0.22), color: c })
        }
      }
    }

    // Pool of window light spilling onto the snow out front.
    const pool = new Object3D()
    houseLocalToWorld(h, 0, 0.25, h.d / 2 + 4, pool.position)
    pool.rotation.set(-Math.PI / 2, 0, -h.rot)
    pool.scale.set(h.w * 1.7, h.d * 1.2, 1)
    pool.updateMatrix()
    pools.push({ matrix: pool.matrix.clone(), color: new Color('#ff9a45').multiplyScalar(0.45) })
  }

  return { windows, chimneys, bulbs, pools, chimneyTops }
}

let cache: { houses: House[]; data: ReturnType<typeof buildVillageData> } | null = null
/** The village layout is deterministic — compute it once and share it (houses, smoke, lights). */
export function getVillage() {
  if (!cache) {
    const houses = generateHouses()
    cache = { houses, data: buildVillageData(houses) }
  }
  return cache
}

export function useInstances(ref: React.RefObject<InstancedMesh | null>, items: { matrix: Matrix4; color?: Color }[]) {
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    items.forEach((it, i) => {
      m.setMatrixAt(i, it.matrix)
      if (it.color) m.setColorAt(i, it.color)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [ref, items])
}

