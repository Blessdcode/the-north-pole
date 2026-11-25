import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointsMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { journey } from '../../../cinematic/journey'
import { mulberry32 } from '../../../lib/math'
import { createNoise2D } from '../../../lib/noise'
import { heightAt, SEA_LEVEL } from '../../world/geography'
import { createGlowTexture } from '../village/village-assets'
import { FLIGHT_LENGTH, flightLocal, frameAt, createFrame } from './flight-path'

/**
 * The world beyond the mountains, seen from the sleigh: a frozen sea reaching
 * to the horizon with icebergs locked in it, banks of moonlit cloud along the
 * route, and the lights of distant villages along the coast.
 */

/** Pressure cracks and snow drifts on sea ice. */
function iceTexture() {
  const rand = mulberry32(17)
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 512, 512)
  g.addColorStop(0, '#9fb6d6')
  g.addColorStop(1, '#b9cbe4')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 512)
  // Snow drifts.
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(235,242,255,${0.05 + rand() * 0.12})`
    ctx.beginPath()
    ctx.ellipse(rand() * 512, rand() * 512, 20 + rand() * 80, 6 + rand() * 20, rand() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  // Cracks: random walks.
  ctx.strokeStyle = 'rgba(40,70,110,0.55)'
  for (let i = 0; i < 26; i++) {
    let x = rand() * 512
    let y = rand() * 512
    let a = rand() * Math.PI * 2
    ctx.lineWidth = 0.6 + rand() * 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 40; k++) {
      a += (rand() - 0.5) * 0.9
      x += Math.cos(a) * 9
      y += Math.sin(a) * 9
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(30, 20)
  t.anisotropy = 8
  return t
}

/** A soft cloud puff. */
function cloudTexture() {
  const n = createNoise2D(4)
  const size = 128
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size - 0.5
      const v = y / size - 0.5
      const r = Math.hypot(u, v) * 2
      const fall = Math.max(0, 1 - r) ** 1.6
      const noise = 0.55 + 0.3 * n(x * 0.05, y * 0.05) + 0.15 * n(x * 0.13, y * 0.13)
      const a = Math.max(0, Math.min(1, fall * noise * 1.6))
      const i = (y * size + x) * 4
      img.data[i] = 255
      img.data[i + 1] = 255
      img.data[i + 2] = 255
      img.data[i + 3] = a * 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function icebergGeometry() {
  const g = new IcosahedronGeometry(1, 1)
  const pos = g.attributes.position as BufferAttribute
  const rand = mulberry32(8)
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const k = 0.75 + rand() * 0.45
    // Tabular tops, rough flanks.
    pos.setXYZ(i, pos.getX(i) * k, y > 0.2 ? 0.45 + (y - 0.2) * 0.25 : y * 0.9, pos.getZ(i) * k)
  }
  g.computeVertexNormals()
  return g
}

const CLOUDS = 260

export function AerialWorld() {
  const bergs = useRef<InstancedMesh>(null)
  const clouds = useRef<InstancedMesh>(null)

  const res = useMemo(() => {
    const ice = iceTexture()
    const cloud = cloudTexture()
    const glow = createGlowTexture()
    return {
      ice,
      cloud,
      glow,
      seaGeo: new PlaneGeometry(14000, 9000),
      seaMat: new MeshStandardMaterial({ map: ice, color: '#d8e6fa', roughness: 0.32, metalness: 0.08 }),
      bergGeo: icebergGeometry(),
      bergMat: new MeshStandardMaterial({ color: '#dfeaf9', roughness: 0.55, flatShading: true }),
      cloudGeo: new PlaneGeometry(1, 1),
      cloudMat: new MeshBasicMaterial({ map: cloud, color: new Color(0.62, 0.68, 0.82), transparent: true, opacity: 0.62, depthWrite: false }),
      lightsMat: new PointsMaterial({
        map: glow,
        color: new Color(3.2, 2.0, 0.9),
        size: 9,
        sizeAttenuation: true,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
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

  // Icebergs locked in the sea ice.
  const bergCount = useMemo(() => {
    const rand = mulberry32(21)
    const o = new Object3D()
    const list: Object3D['matrix'][] = []
    let guard = 0
    while (list.length < 170 && guard++ < 5000) {
      const x = (rand() - 0.5) * 5600
      const z = -1700 - rand() * 4800
      if (heightAt(x, z) > SEA_LEVEL - 1) continue
      const s = 6 + Math.pow(rand(), 2.2) * 40
      o.position.set(x, SEA_LEVEL - s * 0.15, z)
      o.rotation.set(0, rand() * Math.PI * 2, 0)
      o.scale.set(s * (0.8 + rand() * 0.8), s * (0.5 + rand() * 0.6), s * (0.8 + rand() * 0.8))
      o.updateMatrix()
      list.push(o.matrix.clone())
    }
    return list
  }, [])

  // Cloud banks along the route.
  const cloudSpots = useMemo(() => {
    const rand = mulberry32(31)
    const f = createFrame()
    const spots: { p: Vector3; scale: number }[] = []
    for (let i = 0; i < CLOUDS; i++) {
      const s = 700 + rand() * (FLIGHT_LENGTH * 0.62 - 700)
      frameAt(s, f)
      const lateral = (rand() - 0.5) * 420
      spots.push({
        p: new Vector3(f.pos.x + f.right.x * lateral, f.pos.y - 70 + (rand() - 0.6) * 90, f.pos.z + f.right.z * lateral),
        scale: 60 + rand() * 120,
      })
    }
    return spots
  }, [])

  // Distant villages along the coast.
  const villages = useMemo(() => {
    const rand = mulberry32(41)
    const pts: number[] = []
    for (let cx = -2400; cx <= 2400; cx += 520) {
      // Walk north from the mountains to find the shore.
      let shore = -1
      for (let z = -1150; z > -2600; z -= 10) {
        if (heightAt(cx, z) < 2) {
          shore = z
          break
        }
      }
      if (shore === -1) continue
      const cz = shore + 40
      const n = 30 + Math.floor(rand() * 40)
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * 140
        const z = cz + (rand() - 0.5) * 70
        const y = Math.max(heightAt(x, z), 1) + 2 + rand() * 4
        pts.push(x, y, z)
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3))
    return g
  }, [])
  useEffect(() => () => villages.dispose(), [villages])

  useLayoutEffect(() => {
    const m = bergs.current
    if (!m) return
    bergCount.forEach((mat, i) => m.setMatrixAt(i, mat))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [bergCount])

  const tmp = useMemo(() => new Object3D(), [])
  const camQ = useMemo(() => new Quaternion(), [])
  useFrame(({ camera, clock }) => {
    const m = clouds.current
    if (!m) return
    const t = flightLocal(journey.progress)
    m.visible = t > 0.1
    if (!m.visible) return
    // Billboards: every puff faces the camera; slow drift with the wind.
    const drift = clock.elapsedTime * 2.5
    camera.getWorldQuaternion(camQ)
    cloudSpots.forEach((c, i) => {
      tmp.position.set(c.p.x + drift, c.p.y, c.p.z)
      tmp.quaternion.copy(camQ)
      tmp.scale.set(c.scale * 1.6, c.scale, 1)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group name="AerialWorld">
      <mesh geometry={res.seaGeo} material={res.seaMat} rotation-x={-Math.PI / 2} position={[0, SEA_LEVEL, -5600]} receiveShadow />
      <instancedMesh ref={bergs} args={[res.bergGeo, res.bergMat, bergCount.length]} />
      <instancedMesh ref={clouds} args={[res.cloudGeo, res.cloudMat, CLOUDS]} frustumCulled={false} renderOrder={4} />
      <points geometry={villages} material={res.lightsMat} />
    </group>
  )
}
