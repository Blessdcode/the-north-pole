import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  Matrix4,
  ExtrudeGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Shape,
  TubeGeometry,
  Vector3,
} from 'three'
import { journey } from '../../../cinematic/journey'
import { chapterLocal } from '../../../config/destinations'
import { hotspotAnchors } from '../../../interaction/hotspots/hotspot-anchors'
import { smoothstep } from '../../../lib/math'
import { createGlowTexture } from '../village/village-assets'
import { createPaperTexture } from '../workshop/workshop-assets'
import { emitStoryEvent } from '../../../cinematic/story-events'
import { PARTICLE, emitParticles } from '../../systems/particles/steam-emitter'
import { createFrame, flightLocal, flightState, frameAt, sleighDistance } from '../flight/flight-path'
import { Santa } from '../flight/Santa'
import { SLEIGH, sleighLight } from './stables-layout'
import { nowSeconds, stablesState } from './stables-state'

/**
 * The sleigh — swan-curved crimson lacquer, old gold, brass runners curling
 * into scrolls, a velvet seat (empty, for now), and a sack crowned by the
 * golden gift from the Workshop. It lights up lantern by lantern.
 * Local frame: +x forward (rotated to face the doors), y up.
 */
function sideProfile() {
  const s = new Shape()
  s.moveTo(-2.1, 0.55)
  s.lineTo(1.2, 0.55)
  s.quadraticCurveTo(2.0, 0.55, 2.2, 1.0)
  s.bezierCurveTo(2.42, 1.5, 2.3, 2.02, 1.9, 1.96)
  s.quadraticCurveTo(1.6, 1.9, 1.7, 1.62)
  s.quadraticCurveTo(1.76, 1.22, 1.3, 1.06)
  s.lineTo(-0.6, 1.06)
  s.quadraticCurveTo(-1.2, 1.06, -1.45, 1.6)
  s.quadraticCurveTo(-1.72, 2.08, -2.16, 1.86)
  s.quadraticCurveTo(-2.32, 1.3, -2.1, 0.55)
  return s
}

/** Points along the top edge of the profile (for the gold trim). */
const TRIM: [number, number][] = [
  [2.2, 1.0],
  [2.33, 1.45],
  [2.2, 1.9],
  [1.9, 1.96],
  [1.68, 1.75],
  [1.62, 1.35],
  [1.3, 1.07],
  [0.4, 1.07],
  [-0.6, 1.07],
  [-1.15, 1.2],
  [-1.45, 1.6],
  [-1.8, 2.0],
  [-2.16, 1.86],
]

const RUNNER: [number, number][] = [
  [-2.5, 0.06],
  [-1.0, 0.04],
  [1.4, 0.04],
  [2.35, 0.16],
  [2.85, 0.6],
  [2.72, 1.02],
  [2.42, 0.95],
  [2.48, 0.75],
]

const LANTERNS: [number, number, number][] = [
  [1.45, 1.42, -1.08],
  [1.45, 1.42, 1.08],
  [-1.95, 2.12, -0.98],
  [-1.95, 2.12, 0.98],
]

export function Sleigh() {
  const lanterns = useRef<(Mesh | null)[]>([])
  const bulbs = useRef<InstancedMesh>(null)
  const pool = useRef<Mesh>(null)
  const root = useRef<Group>(null)
  const fly = useMemo(() => ({ frame: createFrame(), basis: new Matrix4(), z: new Vector3(), w: new Vector3(), prevS: 0, prevT: 0 }), [])

  const res = useMemo(() => {
    const side = new ExtrudeGeometry(sideProfile(), { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 24 })
    side.translate(0, 0, -0.06)
    const trimCurve = new CatmullRomCurve3(TRIM.map(([x, y]) => new Vector3(x, y + 0.02, 0)), false, 'centripetal')
    const runnerCurve = new CatmullRomCurve3(RUNNER.map(([x, y]) => new Vector3(x, y, 0)), false, 'centripetal')
    const gold = createPaperTexture('#d6a63c', '#8a0c12')
    const glowTex = createGlowTexture()
    return {
      side,
      trim: new TubeGeometry(trimCurve, 120, 0.045, 8, false),
      runner: new TubeGeometry(runnerCurve, 140, 0.06, 10, false),
      runnerCurve,
      bulbGeo: new IcosahedronGeometry(0.035, 1),
      gold,
      glowTex,
      lacquer: new MeshStandardMaterial({ color: '#8a0c12', roughness: 0.18, metalness: 0.35 }),
      goldMat: new MeshStandardMaterial({ color: '#d9a94e', roughness: 0.22, metalness: 1, emissive: new Color('#5a3a0a'), emissiveIntensity: 0 }),
      velvet: new MeshStandardMaterial({ color: '#4a0a10', roughness: 0.95 }),
      tartan: new MeshStandardMaterial({ color: '#1f4a2c', roughness: 0.9 }),
      sackMat: new MeshStandardMaterial({ color: '#5b2a1a', roughness: 0.95 }),
      giftGold: new MeshStandardMaterial({ map: gold, roughness: 0.35, metalness: 0.3, emissive: new Color('#7a4a10'), emissiveIntensity: 0.4 }),
      ribbon: new MeshStandardMaterial({ color: '#b3121b', roughness: 0.3 }),
      glass: [0, 1, 2, 3].map(() => new MeshBasicMaterial({ color: new Color(0.25, 0.2, 0.12), toneMapped: false })),
      bulbMat: new MeshBasicMaterial({ color: new Color(0.2, 0.18, 0.15), toneMapped: false }),
      poolMat: new MeshBasicMaterial({
        map: glowTex,
        color: new Color('#ffb060'),
        transparent: true,
        opacity: 0,
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
        else if ('dispose' in v) (v as { dispose: () => void }).dispose()
      })
    },
    [res],
  )

  // Tiny lights along both runners.
  const bulbMatrices = useMemo(() => {
    const o = new Object3D()
    const p = new Vector3()
    const list: Object3D['matrix'][] = []
    for (const z of [-0.78, 0.78]) {
      for (let i = 0; i <= 34; i++) {
        res.runnerCurve.getPointAt(i / 34, p)
        o.position.set(p.x, p.y + 0.09, z)
        o.updateMatrix()
        list.push(o.matrix.clone())
      }
    }
    return list
  }, [res])
  useLayoutEffect(() => {
    const m = bulbs.current
    if (!m) return
    bulbMatrices.forEach((mat, i) => m.setMatrixAt(i, mat))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [bulbMatrices])

  useEffect(() => {
    hotspotAnchors.sleigh.world.set(SLEIGH.x, SLEIGH.y + 2.6, SLEIGH.z)
  }, [])

  const warm = useMemo(() => new Color(), [])
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(Math.max(rawDt, 1e-4), 0.1)
    const time = clock.elapsedTime
    const g = root.current
    // Destination 06: the sleigh follows the flight path; otherwise it stands in the barn.
    const ft = flightLocal(journey.progress)
    if (g) {
      if (ft > 0) {
        const s = sleighDistance(ft)
        const f = frameAt(s, fly.frame)
        fly.z.crossVectors(f.forward, f.up)
        fly.basis.makeBasis(f.forward, f.up, fly.z)
        g.position.copy(f.pos)
        g.quaternion.setFromRotationMatrix(fly.basis)
        const speed = (s - fly.prevS) / dt
        flightState.speed = speed
        flightState.s = s
        flightState.airborne = f.bank !== 0 || s > 190 ? 1 : 0
        flightState.pos.copy(f.pos)
        fly.prevS = s
        // Snow thrown up by the runners on the ground run; a golden trail once airborne.
        if (s > 2 && s < 200 && speed > 2) {
          for (const side of [-0.8, 0.8]) {
            fly.w.set(-2.2, 0.1, side).applyMatrix4(g.matrixWorld)
            emitParticles(time, PARTICLE.SNOW, fly.w.x, fly.w.y, fly.w.z, 0, 2 + speed * 0.06, 0, Math.min(6, Math.round(speed * dt * 4)), 2.4)
          }
        }
        if (s > 170) {
          fly.w.set(-2.4, 0.2, 0).applyMatrix4(g.matrixWorld)
          emitParticles(time, PARTICLE.SPARKLE, fly.w.x, fly.w.y, fly.w.z, 0, -0.4, 0, 3, 0.9)
        }
        const crossed = (m: number) => fly.prevT < m && ft >= m
        if (crossed(0.03)) emitStoryEvent('flight:start', {})
        if (crossed(0.155)) emitStoryEvent('flight:liftoff', {})
        if (crossed(0.255)) emitStoryEvent('flight:reveal', {})
        if (crossed(0.885)) emitStoryEvent('flight:farewell', {})
      } else {
        g.position.copy(SLEIGH)
        g.rotation.set(0, Math.PI / 2, 0)
        fly.prevS = 0
        flightState.speed = 0
        flightState.s = 0
        flightState.airborne = 0
      }
    }
    fly.prevT = ft
    const t = ft > 0 ? 1 : chapterLocal(journey.progress, 'stables')
    const light = sleighLight(t)
    const bells = Math.exp(-(nowSeconds() - stablesState.bellsAt) * 1.5)
    // Lanterns light one after another; they flicker a little, flare when the bells ring.
    res.glass.forEach((m, i) => {
      const on = smoothstep(i * 0.22, i * 0.22 + 0.2, light)
      const flicker = 1 + Math.sin(time * (7 + i) + i * 3) * 0.04
      warm.setRGB(0.25 + on * 5.5 * flicker, 0.2 + on * 3.4 * flicker, 0.12 + on * 1.3)
      m.color.copy(warm).multiplyScalar(1 + bells * 0.6)
    })
    const strand = smoothstep(0.75, 1, light)
    res.bulbMat.color.setRGB(0.2 + strand * 5, 0.18 + strand * 4.2, 0.15 + strand * 2.6)
    res.goldMat.emissiveIntensity = light * 0.9 + bells * 0.6
    res.poolMat.opacity = light * 0.55
  })

  return (
    <group ref={root} name="Sleigh" position={SLEIGH} rotation-y={Math.PI / 2}>
      <Santa />
      {/* Side panels, floor, dash and back */}
      {[-0.92, 0.92].map((z) => (
        <group key={z}>
          <mesh geometry={res.side} material={res.lacquer} position-z={z} castShadow />
          <mesh geometry={res.trim} material={res.goldMat} position-z={z + Math.sign(z) * 0.1} />
          <mesh geometry={res.runner} material={res.goldMat} position-z={z * 0.85} />
          {[-1.6, -0.2, 1.1].map((x) => (
            <mesh key={x} material={res.goldMat} position={[x, 0.3, z * 0.85]}>
              <cylinderGeometry args={[0.035, 0.035, 0.52, 8]} />
            </mesh>
          ))}
          {/* Sleigh bells along the side */}
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} material={res.goldMat} position={[-1.4 + i * 0.32, 0.92, z + Math.sign(z) * 0.14]}>
              <sphereGeometry args={[0.06, 10, 8]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh material={res.lacquer} position={[-0.4, 0.6, 0]}>
        <boxGeometry args={[3.4, 0.1, 1.84]} />
      </mesh>
      <mesh material={res.lacquer} position={[1.3, 0.8, 0]}>
        <boxGeometry args={[0.1, 0.5, 1.84]} />
      </mesh>
      <mesh material={res.lacquer} position={[-2.05, 1.1, 0]}>
        <boxGeometry args={[0.1, 1.1, 1.84]} />
      </mesh>
      {/* Velvet seat and backrest, a folded tartan blanket — the seat is empty */}
      <mesh material={res.velvet} position={[-0.35, 0.95, 0]}>
        <boxGeometry args={[1.3, 0.3, 1.7]} />
      </mesh>
      <mesh material={res.velvet} position={[-1.08, 1.3, 0]} rotation-z={-0.22}>
        <boxGeometry args={[0.22, 0.8, 1.7]} />
      </mesh>
      <mesh material={res.tartan} position={[-0.25, 1.15, 0.42]}>
        <boxGeometry args={[0.7, 0.12, 0.6]} />
      </mesh>
      {/* Sack of gifts, the golden one on top */}
      <mesh material={res.sackMat} position={[-1.62, 1.55, 0]} scale={[0.6, 0.72, 0.75]}>
        <sphereGeometry args={[1, 18, 14]} />
      </mesh>
      {[
        [-1.5, 2.15, -0.3, '#b3121b'],
        [-1.75, 2.12, 0.28, '#1f6b35'],
        [-1.35, 2.05, 0.35, '#1b3f8a'],
      ].map(([x, y, z, c]) => (
        <mesh key={String(c)} position={[x as number, y as number, z as number]} rotation={[0.2, 0.4, -0.15]}>
          <boxGeometry args={[0.38, 0.3, 0.38]} />
          <meshStandardMaterial color={c as string} roughness={0.5} />
        </mesh>
      ))}
      <group position={[-1.6, 2.38, -0.02]} rotation={[0.1, 0.3, 0.08]}>
        <mesh material={res.giftGold}>
          <boxGeometry args={[0.46, 0.4, 0.46]} />
        </mesh>
        <mesh material={res.ribbon}>
          <boxGeometry args={[0.48, 0.42, 0.08]} />
        </mesh>
        <mesh material={res.ribbon}>
          <boxGeometry args={[0.08, 0.42, 0.48]} />
        </mesh>
      </group>
      {/* Carriage lanterns */}
      {LANTERNS.map((p, i) => (
        <group key={i} position={p}>
          <mesh material={res.goldMat} position-y={-0.32}>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 6]} />
          </mesh>
          <mesh ref={(m) => void (lanterns.current[i] = m)} material={res.glass[i]}>
            <cylinderGeometry args={[0.11, 0.11, 0.26, 6]} />
          </mesh>
          <mesh material={res.goldMat} position-y={0.17}>
            <coneGeometry args={[0.15, 0.14, 6]} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={bulbs} args={[res.bulbGeo, res.bulbMat, bulbMatrices.length]} />
      <mesh ref={pool} material={res.poolMat} position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[9, 6]} />
      </mesh>
    </group>
  )
}

