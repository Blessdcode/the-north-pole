import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { journey } from '../../../cinematic/journey'
import { clamp, damp, smoothstep } from '../../../lib/math'
import { flightLocal } from './flight-path'
import { santaState } from './santa-state'

/**
 * Santa — seated at the reins (temporary procedural stand-in for a rigged
 * character; see ASSETS.md). Hidden until the flight is underway; during the
 * reveal orbit he turns to the camera and raises a hand.
 * Sleigh-local frame: +x forward, y up, +z to his right.
 */
type RGB = [number, number, number]
const RED: RGB = [0.62, 0.04, 0.06]
const FUR: RGB = [0.95, 0.94, 0.9]
const SKIN: RGB = [0.93, 0.72, 0.6]
const ROSY: RGB = [0.92, 0.5, 0.45]
const BLACK: RGB = [0.04, 0.035, 0.03]
const GOLD: RGB = [0.95, 0.72, 0.3]
const MITTEN: RGB = [0.1, 0.26, 0.13]

function paint(g: BufferGeometry, rgb: RGB) {
  const ng = g.index ? g.toNonIndexed() : g
  const n = ng.attributes.position.count
  const c = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.set(rgb, i * 3)
  ng.setAttribute('color', new BufferAttribute(c, 3))
  for (const name of Object.keys(ng.attributes)) if (!['position', 'normal', 'color'].includes(name)) ng.deleteAttribute(name)
  return ng
}
const ell = (rx: number, ry: number, rz: number, x: number, y: number, z: number, seg = 18) =>
  new SphereGeometry(1, seg, Math.round(seg * 0.7)).scale(rx, ry, rz).translate(x, y, z)

/** A cylinder spanning two points. */
function limb(a: [number, number, number], b: [number, number, number], r0: number, r1: number) {
  const A = new Vector3(...a)
  const B = new Vector3(...b)
  const len = A.distanceTo(B)
  const g = new CylinderGeometry(r1, r0, len, 12)
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), B.clone().sub(A).normalize())
  g.applyMatrix4(new Matrix4().makeRotationFromQuaternion(q))
  const mid = A.add(B).multiplyScalar(0.5)
  return g.translate(mid.x, mid.y, mid.z)
}

function merge(parts: BufferGeometry[]) {
  const g = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  g.computeVertexNormals()
  return g
}

function buildBody() {
  const parts: BufferGeometry[] = []
  for (const s of [-1, 1]) {
    parts.push(paint(limb([-0.45, 1.25, s * 0.2], [0.15, 1.22, s * 0.22], 0.15, 0.13), RED))
    parts.push(paint(limb([0.15, 1.22, s * 0.22], [0.32, 0.78, s * 0.22], 0.12, 0.1), RED))
    parts.push(paint(new TorusGeometry(0.11, 0.045, 8, 16).rotateX(Math.PI / 2).translate(0.31, 0.8, s * 0.22), FUR))
    parts.push(paint(ell(0.17, 0.1, 0.11, 0.38, 0.69, s * 0.22), BLACK))
  }
  parts.push(paint(ell(0.36, 0.5, 0.42, -0.5, 1.68, 0), RED))
  parts.push(paint(ell(0.36, 0.34, 0.4, -0.36, 1.5, 0), RED))
  parts.push(paint(new TorusGeometry(0.44, 0.07, 8, 28).rotateX(Math.PI / 2).translate(-0.42, 1.24, 0), FUR))
  parts.push(paint(new TorusGeometry(0.45, 0.055, 8, 28).rotateX(Math.PI / 2).translate(-0.42, 1.48, 0), BLACK))
  parts.push(paint(ell(0.04, 0.09, 0.11, 0.02, 1.48, 0, 10), GOLD))
  parts.push(paint(ell(0.05, 0.36, 0.08, -0.1, 1.66, 0, 10), FUR))
  // Left arm, to the reins.
  parts.push(paint(limb([-0.5, 1.95, -0.42], [-0.22, 1.62, -0.5], 0.12, 0.11), RED))
  parts.push(paint(limb([-0.22, 1.62, -0.5], [0.12, 1.55, -0.32], 0.1, 0.09), RED))
  parts.push(paint(new TorusGeometry(0.09, 0.04, 8, 14).rotateY(Math.PI / 2).translate(0.1, 1.55, -0.33), FUR))
  parts.push(paint(ell(0.1, 0.085, 0.085, 0.2, 1.55, -0.3, 12), MITTEN))
  // Fur collar.
  parts.push(paint(new TorusGeometry(0.22, 0.07, 8, 20).rotateX(Math.PI / 2).translate(-0.48, 2.12, 0), FUR))
  return merge(parts)
}

function buildRightArm() {
  // Pivot at the shoulder (−0.5, 1.95, 0.42); arm reaching forward to the reins.
  return merge([
    paint(limb([0, 0, 0], [0.28, -0.33, 0.08], 0.12, 0.11), RED),
    paint(limb([0.28, -0.33, 0.08], [0.62, -0.4, -0.1], 0.1, 0.09), RED),
    paint(new TorusGeometry(0.09, 0.04, 8, 14).rotateY(Math.PI / 2).translate(0.6, -0.4, -0.09), FUR),
    paint(ell(0.1, 0.085, 0.085, 0.7, -0.4, -0.12, 12), MITTEN),
  ])
}

function buildHead() {
  // Pivot at the base of the neck (−0.48, 2.15, 0).
  const parts: BufferGeometry[] = [
    paint(ell(0.2, 0.21, 0.19, 0.02, 0.2, 0), SKIN),
    paint(new SphereGeometry(0.048, 10, 8).translate(0.21, 0.18, 0), ROSY),
    paint(new SphereGeometry(0.05, 10, 8).translate(0.15, 0.13, 0.1), ROSY),
    paint(new SphereGeometry(0.05, 10, 8).translate(0.15, 0.13, -0.1), ROSY),
    paint(new SphereGeometry(0.022, 8, 6).translate(0.18, 0.25, 0.07), BLACK),
    paint(new SphereGeometry(0.022, 8, 6).translate(0.18, 0.25, -0.07), BLACK),
    paint(ell(0.035, 0.022, 0.06, 0.18, 0.3, 0.075, 8), FUR),
    paint(ell(0.035, 0.022, 0.06, 0.18, 0.3, -0.075, 8), FUR),
    // Moustache and the great white beard.
    paint(ell(0.05, 0.035, 0.1, 0.2, 0.1, 0.07, 10).rotateX(0.0), FUR),
    paint(ell(0.05, 0.035, 0.1, 0.2, 0.1, -0.07, 10), FUR),
    paint(ell(0.13, 0.12, 0.17, 0.12, 0.0, 0), FUR),
    paint(ell(0.11, 0.13, 0.13, 0.13, -0.12, 0.07), FUR),
    paint(ell(0.11, 0.13, 0.13, 0.13, -0.12, -0.07), FUR),
    paint(ell(0.1, 0.14, 0.12, 0.1, -0.26, 0), FUR),
    paint(ell(0.07, 0.1, 0.08, 0.08, -0.38, 0.03), FUR),
    paint(ell(0.09, 0.12, 0.09, -0.02, 0.12, 0.17), FUR),
    paint(ell(0.09, 0.12, 0.09, -0.02, 0.12, -0.17), FUR),
    // Stocking cap, fur brim, pom-pom.
    paint(new ConeGeometry(0.2, 0.5, 18).rotateZ(0.55).translate(-0.12, 0.52, 0), RED),
    paint(new TorusGeometry(0.2, 0.065, 8, 24).rotateX(Math.PI / 2).rotateZ(0.15).translate(-0.02, 0.36, 0), FUR),
    paint(new SphereGeometry(0.075, 12, 10).translate(-0.34, 0.66, 0), FUR),
  ]
  return merge(parts)
}

export function Santa() {
  const root = useRef<Group>(null)
  const head = useRef<Group>(null)
  const arm = useRef<Group>(null)
  const leftHand = useRef<Mesh>(null)
  const res = useMemo(
    () => ({
      body: buildBody(),
      head: buildHead(),
      arm: buildRightArm(),
      material: new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
    }),
    [],
  )
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res])

  const sim = useMemo(() => ({ cam: new Vector3(), local: new Vector3(), inv: new Matrix4(), yaw: 0, pitch: 0 }), [])

  useFrame(({ camera, clock }, rawDt) => {
    const dt = Math.min(Math.max(rawDt, 0), 0.1)
    const g = root.current
    if (!g || !head.current || !arm.current) return
    const t = flightLocal(journey.progress)
    // Hidden until the team is underway (the high seat-back and sack hide the seat from behind).
    const visible = t > 0.12
    g.visible = visible
    santaState.visible = visible
    if (!visible) return
    const time = clock.elapsedTime

    // During the reveal and alongside, he looks at the camera.
    camera.getWorldPosition(sim.cam)
    g.updateWorldMatrix(true, false)
    sim.inv.copy(g.matrixWorld).invert()
    sim.local.copy(sim.cam).applyMatrix4(sim.inv).sub(new Vector3(-0.48, 2.35, 0))
    const attentive = smoothstep(0.2, 0.26, t) * (1 - smoothstep(0.33, 0.37, t)) + smoothstep(0.67, 0.7, t) * (1 - smoothstep(0.78, 0.8, t))
    const yawToCam = clamp(Math.atan2(-sim.local.z, sim.local.x), -1.1, 1.1)
    const pitchToCam = clamp(Math.atan2(sim.local.y, Math.hypot(sim.local.x, sim.local.z)), -0.4, 0.4)
    sim.yaw = damp(sim.yaw, yawToCam * attentive + Math.sin(time * 0.4) * 0.08 * (1 - attentive), 3, dt)
    sim.pitch = damp(sim.pitch, pitchToCam * attentive * 0.6, 3, dt)
    head.current.rotation.set(0, sim.yaw, sim.pitch, 'YXZ')

    // The wave.
    const wave = smoothstep(0.255, 0.272, t) * (1 - smoothstep(0.305, 0.325, t))
    arm.current.rotation.set(-wave * 1.5, 0, wave * 0.9 + Math.sin(time * 9) * 0.18 * wave)
    // Reins bounce; body leans with the gallop.
    g.position.y = Math.sin(time * 9) * 0.01
    g.rotation.z = Math.sin(time * 4.5) * 0.015

    // Hand positions (world) for the reins.
    if (leftHand.current) leftHand.current.getWorldPosition(santaState.hands[0])
    santaState.hands[1].set(0.7, -0.4, -0.12).applyMatrix4(arm.current.matrixWorld)
  })

  return (
    <group ref={root} name="Santa" visible={false}>
      <mesh geometry={res.body} material={res.material} castShadow />
      <mesh ref={leftHand} position={[0.2, 1.55, -0.3]} visible={false}>
        <sphereGeometry args={[0.01, 4, 4]} />
      </mesh>
      <group ref={arm} position={[-0.5, 1.95, 0.42]}>
        <mesh geometry={res.arm} material={res.material} />
      </group>
      <group ref={head} position={[-0.48, 2.15, 0]}>
        <mesh geometry={res.head} material={res.material} />
      </group>
    </group>
  )
}
