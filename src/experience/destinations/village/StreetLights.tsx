import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
} from 'three'
import { mulberry32 } from '../../../lib/math'
import { buildSpruceGeometry } from '../../world/forest-assets'
import { heightAt } from '../../world/geography'
import { applyFestiveWave } from '../../systems/lighting/festive-lights'
import { createGlowTexture } from './village-assets'
import { generateLamps, PLAZA_RADIUS } from './village-layout'

/**
 * Lamp posts, plaza garlands, decorated Christmas trees and the light pools
 * they cast — the warm, golden half of the colour script.
 */
const LAMP_HEIGHT = 5.2

export function StreetLights() {
  const lamps = useMemo(() => generateLamps(), [])

  const data = useMemo(() => {
    const rand = mulberry32(7)
    const o = new Object3D()
    const posts: Matrix4[] = []
    const globes: Matrix4[] = []
    const pools: { m: Matrix4; c: Color }[] = []
    const bulbs: { m: Matrix4; c: Color }[] = []
    const trees: Matrix4[] = []

    for (const l of lamps) {
      o.position.set(l.x, l.y + LAMP_HEIGHT / 2, l.z)
      o.rotation.set(0, 0, 0)
      o.scale.set(1, 1, 1)
      o.updateMatrix()
      posts.push(o.matrix.clone())
      o.position.set(l.x, l.y + LAMP_HEIGHT + 0.35, l.z)
      o.updateMatrix()
      globes.push(o.matrix.clone())
      o.position.set(l.x, l.y + 0.2, l.z)
      o.rotation.set(-Math.PI / 2, 0, 0)
      o.scale.set(17, 17, 1)
      o.updateMatrix()
      pools.push({ m: o.matrix.clone(), c: new Color('#ffa456').multiplyScalar(0.55) })
    }

    // Garlands: catenary strands from the clock tower's cornice to the plaza lamps.
    const plazaLamps = lamps.slice(0, 12)
    const palette = ['#ffd27a', '#ff4d3d', '#ffd27a', '#3ee07a', '#ffd27a', '#5aa8ff'].map((c) => new Color(c))
    plazaLamps.forEach((l, li) => {
      const dir = new Vector3(l.x, 0, l.z).normalize()
      const a = dir.clone().multiplyScalar(9.6).setY(30)
      const b = new Vector3(l.x, l.y + LAMP_HEIGHT + 0.2, l.z)
      const mid = a.clone().lerp(b, 0.55)
      mid.y = Math.min(a.y, b.y) + (a.y - b.y) * 0.18
      const curve = new CatmullRomCurve3([a, mid, b])
      const n = 34
      for (let i = 1; i < n; i++) {
        const p = curve.getPoint(i / n)
        o.position.copy(p)
        o.rotation.set(0, 0, 0)
        o.scale.setScalar(0.2)
        o.updateMatrix()
        bulbs.push({ m: o.matrix.clone(), c: palette[(i + li) % palette.length].clone().multiplyScalar(3.5) })
      }
    })

    // Garlands strung across the four streets, every 28 m (they light with the festive wave).
    for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      for (let r = 74; r < 236; r += 28) {
        const cx = Math.sin(angle) * r
        const cz = Math.cos(angle) * r
        const px = Math.cos(angle) * 9
        const pz = -Math.sin(angle) * 9
        const a = new Vector3(cx - px, heightAt(cx - px, cz - pz) + 7.2, cz - pz)
        const b = new Vector3(cx + px, heightAt(cx + px, cz + pz) + 7.2, cz + pz)
        const n = 20
        for (let i = 1; i < n; i++) {
          const u = i / n
          o.position.copy(a).lerp(b, u)
          o.position.y -= Math.sin(u * Math.PI) * 1.4
          o.rotation.set(0, 0, 0)
          o.scale.setScalar(0.2)
          o.updateMatrix()
          bulbs.push({ m: o.matrix.clone(), c: palette[(i + Math.round(r)) % palette.length].clone().multiplyScalar(3.5) })
        }
      }
    }

    // Four decorated plaza trees with spiralling lights and a star.
    const treePositions = [0.25, 0.75, 1.25, 1.75].map((k) => {
      const a = Math.PI * k
      return new Vector3(Math.sin(a) * 30, 0, Math.cos(a) * 30)
    })
    for (const t of treePositions) {
      t.y = heightAt(t.x, t.z)
      const s = 1.7
      o.position.copy(t)
      o.rotation.set(0, rand() * 6, 0)
      o.scale.setScalar(s)
      o.updateMatrix()
      trees.push(o.matrix.clone())
      const turns = 7
      const n = 90
      for (let i = 0; i < n; i++) {
        const f = i / n
        const h = 2.5 + f * 12.5 * s
        const r = (4.4 - f * 3.9) * s + 0.25
        const ang = f * turns * Math.PI * 2
        o.position.set(t.x + Math.cos(ang) * r, t.y + h, t.z + Math.sin(ang) * r)
        o.rotation.set(0, 0, 0)
        o.scale.setScalar(0.22)
        o.updateMatrix()
        bulbs.push({ m: o.matrix.clone(), c: palette[i % palette.length].clone().multiplyScalar(3.5) })
      }
      o.position.set(t.x, t.y + 14.4 * s, t.z)
      o.scale.setScalar(0.8)
      o.updateMatrix()
      bulbs.push({ m: o.matrix.clone(), c: new Color(7, 5, 2) })
      o.position.set(t.x, t.y + 0.25, t.z)
      o.rotation.set(-Math.PI / 2, 0, 0)
      o.scale.set(30, 30, 1)
      o.updateMatrix()
      pools.push({ m: o.matrix.clone(), c: new Color('#ffb25e').multiplyScalar(0.5) })
    }

    // Big plaza glow under the tower.
    o.position.set(0, 4.4, 0)
    o.rotation.set(-Math.PI / 2, 0, 0)
    o.scale.set(PLAZA_RADIUS * 2.8, PLAZA_RADIUS * 2.8, 1)
    o.updateMatrix()
    pools.push({ m: o.matrix.clone(), c: new Color('#ff9a48').multiplyScalar(0.35) })

    return { posts, globes, pools, bulbs, trees }
  }, [lamps])

  const res = useMemo(() => {
    const glow = createGlowTexture()
    return {
      glow,
      postGeo: new CylinderGeometry(0.12, 0.2, LAMP_HEIGHT, 6),
      globeGeo: new IcosahedronGeometry(0.42, 1),
      bulbGeo: new IcosahedronGeometry(1, 1),
      poolGeo: new PlaneGeometry(1, 1),
      treeGeo: buildSpruceGeometry(),
      postMat: new MeshStandardMaterial({ color: '#10161a', metalness: 0.6, roughness: 0.5 }),
      globeMat: new MeshBasicMaterial({ color: new Color(6.5, 3.8, 1.6), toneMapped: false }),
      bulbMat: (() => {
        const m = new MeshBasicMaterial({ toneMapped: false })
        applyFestiveWave(m)
        return m
      })(),
      treeMat: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
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
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res])

  const posts = useRef<InstancedMesh>(null)
  const globes = useRef<InstancedMesh>(null)
  const pools = useRef<InstancedMesh>(null)
  const bulbs = useRef<InstancedMesh>(null)
  const trees = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const set = (mesh: InstancedMesh | null, items: { m: Matrix4; c?: Color }[]) => {
      if (!mesh) return
      items.forEach((it, i) => {
        mesh.setMatrixAt(i, it.m)
        if (it.c) mesh.setColorAt(i, it.c)
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
    set(posts.current, data.posts.map((m) => ({ m })))
    set(globes.current, data.globes.map((m) => ({ m })))
    set(pools.current, data.pools)
    set(bulbs.current, data.bulbs)
    set(trees.current, data.trees.map((m) => ({ m })))
  }, [data])

  return (
    <group name="StreetLights">
      <instancedMesh ref={posts} args={[res.postGeo, res.postMat, data.posts.length]} />
      <instancedMesh ref={globes} args={[res.globeGeo, res.globeMat, data.globes.length]} />
      <instancedMesh ref={bulbs} args={[res.bulbGeo, res.bulbMat, data.bulbs.length]} />
      <instancedMesh ref={trees} args={[res.treeGeo, res.treeMat, data.trees.length]} />
      <instancedMesh ref={pools} args={[res.poolGeo, res.poolMat, data.pools.length]} renderOrder={2} />
    </group>
  )
}
