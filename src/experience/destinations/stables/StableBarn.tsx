import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  ExtrudeGeometry,
  Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Path,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
} from 'three'
import { journey } from '../../../cinematic/journey'
import { emitStoryEvent } from '../../../cinematic/story-events'
import { chapterLocal } from '../../../config/destinations'
import { mulberry32 } from '../../../lib/math'
import { createGlowTexture } from '../village/village-assets'
import { BARN, doorsOpen, NAMES, STALL_BOUNDS, STALL_Z } from './stables-layout'

const H = BARN.wallHeight
const W = BARN.half
const L = BARN.south - BARN.north // 60
const PITCH = Math.atan2(BARN.ridge, W)
const SLAB = Math.hypot(W + 0.5, BARN.ridge) + 1

function strawTexture() {
  const rand = mulberry32(3)
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#7a5a2a'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1400; i++) {
    const x = rand() * 256
    const y = rand() * 256
    const a = rand() * Math.PI
    const len = 6 + rand() * 16
    ctx.strokeStyle = `hsla(${40 + rand() * 10}, ${50 + rand() * 20}%, ${42 + rand() * 25}%, 0.8)`
    ctx.lineWidth = 1 + rand()
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
    ctx.stroke()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(6, 15)
  return t
}

function nameTexture(name: string) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#2a1a0e'
  ctx.fillRect(0, 0, 512, 128)
  ctx.strokeStyle = '#c99a4b'
  ctx.lineWidth = 6
  ctx.strokeRect(8, 8, 496, 112)
  ctx.fillStyle = '#f0d39a'
  ctx.font = 'italic 600 68px "Cormorant Garamond", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, 256, 68)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/** A gable wall (in the x–y plane) with a door opening, extruded 0.5 m. */
function gable(doorHalf: number, doorH: number) {
  const s = new Shape()
  s.moveTo(-W - 0.5, 0)
  s.lineTo(W + 0.5, 0)
  s.lineTo(W + 0.5, H)
  s.lineTo(0, H + BARN.ridge)
  s.lineTo(-W - 0.5, H)
  s.closePath()
  const door = new Path()
  door.moveTo(-doorHalf, 0)
  door.lineTo(doorHalf, 0)
  door.lineTo(doorHalf, doorH)
  door.lineTo(-doorHalf, doorH)
  door.lineTo(-doorHalf, 0)
  s.holes.push(door)
  return new ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false })
}

export function StableBarn() {
  const leafL = useRef<Group>(null)
  const leafR = useRef<Group>(null)
  const announced = useRef(false)

  const res = useMemo(() => {
    const straw = strawTexture()
    const glow = createGlowTexture()
    const names = NAMES.map(nameTexture)
    return {
      straw,
      glow,
      names,
      nameMats: names.map((map) => new MeshBasicMaterial({ map })),
      south: gable(1.7, 3.6),
      north: gable(3.6, 6.4),
      boards: new MeshStandardMaterial({ color: '#6b1712', roughness: 0.85 }),
      timber: new MeshStandardMaterial({ color: '#5a3820', roughness: 0.85 }),
      dark: new MeshStandardMaterial({ color: '#2a1a10', roughness: 0.8 }),
      roof: new MeshStandardMaterial({ color: '#3a2a22', roughness: 0.8 }),
      snow: new MeshStandardMaterial({ color: '#e4ecfb', roughness: 1 }),
      floor: new MeshStandardMaterial({ map: straw, roughness: 1 }),
      hay: new MeshStandardMaterial({ color: '#b38a3e', roughness: 1 }),
      leather: new MeshStandardMaterial({ color: '#3a1a0c', roughness: 0.6 }),
      brass: new MeshStandardMaterial({ color: '#d2a24f', roughness: 0.3, metalness: 0.9 }),
      wreath: new MeshStandardMaterial({ color: '#1f4a2c', roughness: 0.8 }),
      ribbon: new MeshStandardMaterial({ color: '#b3121b', roughness: 0.4 }),
      windowOut: new MeshBasicMaterial({ color: new Color(2.8, 1.8, 0.9), toneMapped: false }),
      windowIn: new MeshBasicMaterial({ color: new Color(0.05, 0.09, 0.2) }),
      lamp: new MeshBasicMaterial({ color: new Color(6, 3.6, 1.6), toneMapped: false }),
      pool: new MeshBasicMaterial({
        map: glow,
        color: new Color('#ff9a48').multiplyScalar(0.55),
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
      Object.values(res).forEach((v) => {
        if (Array.isArray(v)) v.forEach((m) => m.dispose())
        else v.dispose()
      })
    },
    [res],
  )

  useFrame(() => {
    const t = chapterLocal(journey.progress, 'stables')
    const open = doorsOpen(t)
    if (leafL.current) leafL.current.rotation.y = open * 1.85
    if (leafR.current) leafR.current.rotation.y = -open * 1.85
    if (open > 0.02 && !announced.current) {
      announced.current = true
      emitStoryEvent('stables:doors', {})
    }
    if (open <= 0.001) announced.current = false
  })

  const zc = (BARN.south + BARN.north) / 2
  const lanternZ = [-4, -13, -22, -31, -40, -50]
  const windowZ = [-7, -16, -25, -34, -43, -52]

  return (
    <group name="StableBarn" position={[BARN.x, BARN.floor, 0]}>
      {/* Floor of straw */}
      <mesh material={res.floor} position={[0, 0.03, zc]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W * 2, L]} />
      </mesh>
      {/* Long walls with windows */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={res.boards} position={[s * (W + 0.25), H / 2, zc]} castShadow receiveShadow>
            <boxGeometry args={[0.5, H, L]} />
          </mesh>
          {windowZ.map((z) => (
            <group key={z}>
              <mesh material={res.windowOut} position={[s * (W + 0.52), 5.2, z]} rotation-y={(s * Math.PI) / 2}>
                <planeGeometry args={[1.6, 1.4]} />
              </mesh>
              <mesh material={res.windowIn} position={[s * (W - 0.02), 5.2, z]} rotation-y={(-s * Math.PI) / 2}>
                <planeGeometry args={[1.6, 1.4]} />
              </mesh>
              <mesh material={res.timber} position={[s * (W + 0.56), 5.2, z]}>
                <boxGeometry args={[0.1, 1.7, 0.14]} />
              </mesh>
            </group>
          ))}
          {/* Corner posts */}
          {[BARN.south, BARN.north].map((z) => (
            <mesh key={z} material={res.timber} position={[s * (W + 0.45), H / 2, z]}>
              <boxGeometry args={[0.6, H + 0.2, 0.6]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Gables */}
      <mesh geometry={res.south} material={res.boards} position-z={BARN.south - 0.5} />
      <mesh geometry={res.north} material={res.boards} position-z={BARN.north} />
      {/* Roof, snow, ridge */}
      {[-1, 1].map((s) => (
        <group key={`roof${s}`}>
          <mesh material={res.roof} position={[s * (W / 2 + 0.2), H + BARN.ridge / 2 + 0.25, zc]} rotation-z={-s * PITCH}>
            <boxGeometry args={[SLAB, 0.35, L + 2]} />
          </mesh>
          <mesh material={res.snow} position={[s * (W / 2 + 0.3), H + BARN.ridge / 2 + 0.55, zc]} rotation-z={-s * PITCH}>
            <boxGeometry args={[SLAB - 0.2, 0.3, L + 1.8]} />
          </mesh>
        </group>
      ))}
      <mesh material={res.timber} position={[0, H + BARN.ridge - 0.3, zc]}>
        <boxGeometry args={[0.4, 0.4, L]} />
      </mesh>
      {/* Trusses */}
      {Array.from({ length: 9 }, (_, i) => BARN.south - 0.5 - i * 7.4).map((z) => (
        <group key={`truss${z}`} position-z={z}>
          <mesh material={res.timber} position-y={H - 0.25}>
            <boxGeometry args={[W * 2, 0.45, 0.35]} />
          </mesh>
          <mesh material={res.timber} position-y={H + BARN.ridge / 2 - 0.3}>
            <boxGeometry args={[0.3, BARN.ridge, 0.3]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={res.timber} position={[s * (W / 2), H + BARN.ridge / 2 - 0.45, 0]} rotation-z={-s * PITCH}>
              <boxGeometry args={[SLAB - 1.6, 0.35, 0.3]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Stalls: partitions, aisle posts, mangers, hay, nameplates, harness hooks */}
      {[-1, 1].map((s) => (
        <group key={`stalls${s}`}>
          {STALL_BOUNDS.map((z) => (
            <group key={z}>
              <mesh material={res.timber} position={[s * 7.7, 0.9, z]}>
                <boxGeometry args={[8.4, 1.8, 0.18]} />
              </mesh>
              <mesh material={res.timber} position={[s * 3.4, 1.7, z]}>
                <boxGeometry args={[0.3, 3.4, 0.3]} />
              </mesh>
              <mesh material={res.leather} position={[s * 3.25, 2.4, z + 0.3]} rotation-y={Math.PI / 2}>
                <torusGeometry args={[0.32, 0.04, 6, 16]} />
              </mesh>
              {[0, 1, 2].map((b) => (
                <mesh key={b} material={res.brass} position={[s * 3.2, 2.1 - b * 0.12, z + 0.3 + (b - 1) * 0.18]}>
                  <sphereGeometry args={[0.05, 8, 6]} />
                </mesh>
              ))}
            </group>
          ))}
          {STALL_Z.map((z, i) => (
            <group key={`stall${z}`}>
              <mesh material={res.timber} position={[s * 11.2, 1.0, z]}>
                <boxGeometry args={[1.2, 0.9, 6.8]} />
              </mesh>
              <mesh material={res.hay} position={[s * 11.2, 1.5, z]} scale={[0.6, 0.25, 3.2]}>
                <sphereGeometry args={[1, 12, 8]} />
              </mesh>
              <mesh material={res.hay} position={[s * 9.4, 0.15, z - 2.6]} scale={[1.4, 0.35, 1.1]}>
                <sphereGeometry args={[1, 12, 8]} />
              </mesh>
              <mesh material={res.nameMats[i * 2 + (s > 0 ? 1 : 0)]} position={[s * 3.22, 3.15, z]} rotation-y={(-s * Math.PI) / 2}>
                <planeGeometry args={[2.0, 0.5]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Lanterns along the aisle */}
      {lanternZ.map((z) => (
        <group key={`lantern${z}`}>
          <mesh material={res.lamp} position={[0, 6.4, z]}>
            <sphereGeometry args={[0.3, 12, 8]} />
          </mesh>
          <mesh material={res.dark} position={[0, 7.7, z]}>
            <cylinderGeometry args={[0.03, 0.03, 2.4, 4]} />
          </mesh>
          <mesh material={res.pool} position={[0, 0.06, z]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[11, 11]} />
          </mesh>
        </group>
      ))}
      {/* South door: frame, an open leaf, a wreath, lanterns */}
      <mesh material={res.dark} position={[1.7, 1.8, BARN.south + 0.6]} rotation-y={-1.9}>
        <boxGeometry args={[3.3, 3.5, 0.18]} />
      </mesh>
      <mesh material={res.wreath} position={[0, 4.6, BARN.south + 0.05]}>
        <torusGeometry args={[0.7, 0.22, 10, 24]} />
      </mesh>
      <mesh material={res.ribbon} position={[0, 4.05, BARN.south + 0.2]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
      </mesh>
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} material={res.lamp} position={[x, 3.2, BARN.south + 0.35]}>
          <sphereGeometry args={[0.28, 10, 8]} />
        </mesh>
      ))}
      <mesh material={res.pool} position={[0, 0.08, BARN.south + 8]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[16, 14]} />
      </mesh>
      {/* North doors: two leaves hinged at the opening's edges, swinging out */}
      <group ref={leafL} position={[-3.6, 0, BARN.north]}>
        <mesh material={res.boards} position={[1.8, 3.2, -0.15]}>
          <boxGeometry args={[3.6, 6.4, 0.25]} />
        </mesh>
        <mesh material={res.timber} position={[1.8, 3.2, -0.3]} rotation-z={0.9}>
          <boxGeometry args={[0.25, 6.6, 0.1]} />
        </mesh>
      </group>
      <group ref={leafR} position={[3.6, 0, BARN.north]}>
        <mesh material={res.boards} position={[-1.8, 3.2, -0.15]}>
          <boxGeometry args={[3.6, 6.4, 0.25]} />
        </mesh>
        <mesh material={res.timber} position={[-1.8, 3.2, -0.3]} rotation-z={-0.9}>
          <boxGeometry args={[0.25, 6.6, 0.1]} />
        </mesh>
      </group>
      {[-4.8, 4.8].map((x) => (
        <mesh key={x} material={res.lamp} position={[x, 5.4, BARN.north - 0.4]}>
          <sphereGeometry args={[0.32, 10, 8]} />
        </mesh>
      ))}
    </group>
  )
}
