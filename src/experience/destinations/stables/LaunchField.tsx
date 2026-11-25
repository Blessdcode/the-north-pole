import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from 'three'
import { journey } from '../../../cinematic/journey'
import { chapterLocal } from '../../../config/destinations'
import { smoothstep } from '../../../lib/math'
import { heightAt, STABLES } from '../../world/geography'
import { createGlowTexture } from '../village/village-assets'
import { flightLocal } from '../flight/flight-path'
import { BARN, runwayLit, SLEIGH, SLOT_HALF, SLOT_Z, tracesOn } from './stables-layout'

/**
 * The launch field north of the stables: lantern posts along both edges ignite
 * in a wave from the doors outward, and the team's traces are hooked to the sleigh.
 */
const SPACING = 12
const OFF = 13

export function LaunchField() {
  const posts = useRef<InstancedMesh>(null)
  const lamps = useRef<InstancedMesh>(null)
  const pools = useRef<InstancedMesh>(null)
  const traces = useRef<InstancedMesh>(null)

  const layout = useMemo(() => {
    const o = new Object3D()
    const posts: Matrix4[] = []
    const lamps: Matrix4[] = []
    const pools: Matrix4[] = []
    const dist: number[] = []
    for (let z = BARN.north - 8; z > STABLES.runwayEnd + 6; z -= SPACING) {
      for (const s of [-1, 1]) {
        const x = BARN.x + s * OFF
        const y = heightAt(x, z)
        o.position.set(x, y + 1.6, z)
        o.rotation.set(0, 0, 0)
        o.scale.set(1, 1, 1)
        o.updateMatrix()
        posts.push(o.matrix.clone())
        o.position.set(x, y + 3.35, z)
        o.updateMatrix()
        lamps.push(o.matrix.clone())
        o.position.set(x, y + 0.12, z)
        o.rotation.set(-Math.PI / 2, 0, 0)
        o.scale.set(14, 14, 1)
        o.updateMatrix()
        pools.push(o.matrix.clone())
        dist.push(BARN.north - z)
      }
    }
    return { posts, lamps, pools, dist }
  }, [])

  const res = useMemo(() => {
    const glow = createGlowTexture()
    return {
      glow,
      postGeo: new CylinderGeometry(0.1, 0.14, 3.2, 6),
      lampGeo: new IcosahedronGeometry(0.32, 1),
      poolGeo: new PlaneGeometry(1, 1),
      traceGeo: new BoxGeometry(1, 1, 1),
      iron: new MeshStandardMaterial({ color: '#1d1f22', roughness: 0.5, metalness: 0.7 }),
      leather: new MeshStandardMaterial({ color: '#3a1a0c', roughness: 0.55 }),
      lampMat: new MeshBasicMaterial({ toneMapped: false }),
      poolMat: new MeshBasicMaterial({
        map: glow,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        toneMapped: false,
      }),
    }
  }, [])
  useEffect(
    () => () => {
      Object.values(res).forEach((v) => v.dispose())
    },
    [res],
  )

  // Traces: two long lines from the sleigh's dash to the lead pair, and a crossbar per pair.
  const traceSpecs = useMemo(() => {
    const y = SLEIGH.y + 1.15
    const from = SLEIGH.z - 2.9
    const to = SLOT_Z[3] - 0.2
    const list: { x: number; y: number; z0: number; z1: number; w: number }[] = []
    for (const s of [-1, 1]) list.push({ x: BARN.x + s * (SLOT_HALF + 0.55), y, z0: from, z1: to, w: 0.06 })
    for (const z of SLOT_Z) list.push({ x: BARN.x, y: y - 0.1, z0: z + 1.25, z1: z + 1.35, w: (SLOT_HALF + 0.65) * 2 })
    return list
  }, [])

  useLayoutEffect(() => {
    const set = (m: InstancedMesh | null, list: Matrix4[]) => {
      if (!m) return
      list.forEach((mat, i) => m.setMatrixAt(i, mat))
      m.instanceMatrix.needsUpdate = true
      m.computeBoundingSphere()
    }
    set(posts.current, layout.posts)
    set(lamps.current, layout.lamps)
    set(pools.current, layout.pools)
  }, [layout])

  const tmp = useMemo(() => ({ c: new Color(), o: new Object3D() }), [])
  useFrame(() => {
    const t = chapterLocal(journey.progress, 'stables')
    const lit = runwayLit(t)
    const lm = lamps.current
    const pm = pools.current
    if (lm && pm) {
      layout.dist.forEach((d, i) => {
        const on = smoothstep(d - 6, d, lit)
        tmp.c.setRGB(0.15 + on * 6, 0.1 + on * 3.6, 0.06 + on * 1.5)
        lm.setColorAt(i, tmp.c)
        tmp.c.setRGB(on * 0.55, on * 0.34, on * 0.14)
        pm.setColorAt(i, tmp.c)
      })
      if (lm.instanceColor) lm.instanceColor.needsUpdate = true
      if (pm.instanceColor) pm.instanceColor.needsUpdate = true
    }
    const tr = traces.current
    if (tr) {
      const on = tracesOn(t)
      traceSpecs.forEach((sp, i) => {
        const len = Math.abs(sp.z1 - sp.z0)
        // Long traces grow forward from the sleigh; crossbars appear at once.
        const grow = i < 2 ? on : on > 0.5 ? 1 : 0
        tmp.o.position.set(sp.x, sp.y, sp.z0 - (len * grow) / 2)
        tmp.o.rotation.set(0, 0, 0)
        tmp.o.scale.set(sp.w, i < 2 ? 0.06 : 0.12, Math.max(0.001, i < 2 ? len * grow : 0.12))
        tmp.o.updateMatrix()
        tr.setMatrixAt(i, tmp.o.matrix)
      })
      tr.instanceMatrix.needsUpdate = true
      // Once the flight begins, the team draws its own (moving) traces.
      tr.visible = on > 0.001 && flightLocal(journey.progress) <= 0
    }
  })

  return (
    <group name="LaunchField">
      <instancedMesh ref={posts} args={[res.postGeo, res.iron, layout.posts.length]} />
      <instancedMesh ref={lamps} args={[res.lampGeo, res.lampMat, layout.lamps.length]} />
      <instancedMesh ref={pools} args={[res.poolGeo, res.poolMat, layout.pools.length]} renderOrder={2} />
      <instancedMesh ref={traces} args={[res.traceGeo, res.leather, traceSpecs.length]} frustumCulled={false} />
    </group>
  )
}
