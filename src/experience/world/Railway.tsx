import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Path,
  Shape,
  Vector3,
} from 'three'
import { expressStops, trainState } from '../../cinematic/express-timeline'
import { coverAt, findTunnelPortals, type Portal, TUNNEL_DEPTH } from './geography'
import { gradeAt, RAIL_LENGTH, RAIL_TOP, railDirectionAt, railPointAt } from './railway-path'

/**
 * The railway: the physical thread connecting the arrival valley, the
 * southern range (tunnel), North Pole Station, the frozen forest and the
 * Workshop massif (tunnel). The Christmas Express runs on exactly this line.
 */
const GAUGE = 1.5

const inTunnel = (s: number) => coverAt(s) > TUNNEL_DEPTH - 1
const yawAt = (s: number, v = new Vector3()) => {
  railDirectionAt(s, v)
  return Math.atan2(v.x, v.z)
}

/** Ballast bed ribbon, broken where the line runs inside a mountain. */
function buildBallast() {
  const positions: number[] = []
  const colors: number[] = []
  const index: number[] = []
  const half = 2.6
  const p = new Vector3()
  const d = new Vector3()
  let v = 0
  let prevOk = false
  for (let s = 0; s <= RAIL_LENGTH; s += 3) {
    const ok = !inTunnel(s)
    railPointAt(s, p)
    railDirectionAt(s, d)
    const nx = d.z
    const nz = -d.x
    const y = gradeAt(s) + 0.12
    positions.push(p.x - nx * half, y, p.z - nz * half, p.x + nx * half, y, p.z + nz * half)
    colors.push(0.36, 0.38, 0.44, 0.36, 0.38, 0.44)
    if (ok && prevOk) index.push(v - 2, v - 1, v, v - 1, v + 1, v)
    prevOk = ok
    v += 2
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  g.setIndex(index)
  g.computeVertexNormals()
  return g
}

function TunnelPortal({ portal }: { portal: Portal }) {
  const geometry = useMemo(() => {
    const s = new Shape()
    s.moveTo(-11, -2)
    s.lineTo(11, -2)
    s.lineTo(11, 14)
    s.lineTo(-11, 14)
    s.closePath()
    const hole = new Path()
    hole.moveTo(-4.2, -2)
    hole.lineTo(4.2, -2)
    hole.lineTo(4.2, 6.2)
    hole.absarc(0, 6.2, 4.2, 0, Math.PI, false)
    hole.lineTo(-4.2, -2)
    s.holes.push(hole)
    return new ExtrudeGeometry(s, { depth: 4, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 1 })
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const p = railPointAt(portal.s)
  // The face looks out of the mountain, toward the approaching line.
  const yaw = yawAt(portal.s) + (portal.facing === 1 ? Math.PI : 0)
  return (
    <group position={[p.x, gradeAt(portal.s) - 0.4, p.z]} rotation-y={yaw}>
      <mesh geometry={geometry} position-z={-2} castShadow receiveShadow>
        <meshStandardMaterial color="#5d5850" roughness={0.9} />
      </mesh>
      {/* Darkness inside the bore */}
      <mesh position={[0, 5, -7]}>
        <planeGeometry args={[9, 14]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Keystone lamps */}
      {[-6.5, 6.5].map((lx) => (
        <mesh key={lx} position={[lx, 9, 2.4]}>
          <sphereGeometry args={[0.45, 12, 8]} />
          <meshBasicMaterial color={new Color(5, 2.6, 1)} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 14.3, 0]}>
        <boxGeometry args={[23, 0.6, 5]} />
        <meshStandardMaterial color="#e1e9fa" roughness={1} />
      </mesh>
    </group>
  )
}

const RED = new Color(5, 0.35, 0.2)
const GREEN = new Color(0.3, 5, 1.6)

/** Signals clear to green ahead of the approaching Express and fall back to red behind it. */
function RailSignals() {
  const signals = useMemo(() => {
    const { sStop, westEntranceS, southExitS } = expressStops()
    return [southExitS + 90, sStop + 150, westEntranceS - 70].map((s) => {
      const p = railPointAt(s)
      const d = railDirectionAt(s)
      // Right-hand side of the line in the direction of travel.
      const side = new Vector3(d.z, 0, -d.x).multiplyScalar(-3.4)
      return {
        s,
        pos: new Vector3(p.x + side.x, gradeAt(s), p.z + side.z),
        yaw: Math.atan2(d.x, d.z) + Math.PI,
        material: new MeshBasicMaterial({ color: RED.clone(), toneMapped: false }),
      }
    })
  }, [])
  useEffect(() => () => signals.forEach((s) => s.material.dispose()), [signals])

  useFrame(() => {
    for (const sig of signals) {
      const ahead = sig.s - trainState.s
      const clear = ahead > 0 && ahead < 320
      sig.material.color.copy(clear ? GREEN : RED)
    }
  })

  return (
    <group name="RailSignals">
      {signals.map((sig) => (
        <group key={sig.s} position={sig.pos} rotation-y={sig.yaw}>
          <mesh position-y={3.2}>
            <cylinderGeometry args={[0.13, 0.18, 6.4, 8]} />
            <meshStandardMaterial color="#14181c" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0, 6.2, 0]}>
            <boxGeometry args={[0.7, 1.2, 0.5]} />
            <meshStandardMaterial color="#0c0e10" roughness={0.6} />
          </mesh>
          <mesh position={[0, 6.35, 0.27]} material={sig.material}>
            <circleGeometry args={[0.2, 16]} />
          </mesh>
          <mesh position={[0, 6.9, 0]}>
            <boxGeometry args={[0.8, 0.12, 0.6]} />
            <meshStandardMaterial color="#e1e9fa" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Railway() {
  const rails = useRef<InstancedMesh>(null)
  const sleepers = useRef<InstancedMesh>(null)

  const { railMatrices, sleeperMatrices, portals } = useMemo(() => {
    const o = new Object3D()
    const p = new Vector3()
    const d = new Vector3()
    const railMatrices: Matrix4[] = []
    const sleeperMatrices: Matrix4[] = []
    const SEG = 4
    for (let s = 0; s < RAIL_LENGTH - SEG; s += SEG) {
      const sc = s + SEG / 2
      if (inTunnel(sc)) continue
      railPointAt(sc, p)
      railDirectionAt(sc, d)
      const yaw = Math.atan2(d.x, d.z)
      for (const side of [-1, 1]) {
        o.position.set(p.x + d.z * side * (GAUGE / 2), gradeAt(sc) + RAIL_TOP - 0.1, p.z - d.x * side * (GAUGE / 2))
        o.rotation.set(0, yaw, 0)
        o.scale.set(1, 1, SEG * 1.02)
        o.updateMatrix()
        railMatrices.push(o.matrix.clone())
      }
    }
    for (let s = 0; s < RAIL_LENGTH; s += 1.4) {
      if (inTunnel(s)) continue
      railPointAt(s, p)
      o.position.set(p.x, gradeAt(s) + 0.22, p.z)
      o.rotation.set(0, yawAt(s, d), 0)
      o.scale.set(1, 1, 1)
      o.updateMatrix()
      sleeperMatrices.push(o.matrix.clone())
    }
    return { railMatrices, sleeperMatrices, portals: findTunnelPortals() }
  }, [])

  const res = useMemo(
    () => ({
      railGeo: new BoxGeometry(0.16, 0.2, 1),
      sleeperGeo: new BoxGeometry(2.6, 0.18, 0.32),
      ballastGeo: buildBallast(),
      railMat: new MeshStandardMaterial({ color: '#8f97a6', metalness: 0.9, roughness: 0.3 }),
      sleeperMat: new MeshStandardMaterial({ color: '#2a1c14', roughness: 0.95 }),
      ballastMat: new MeshStandardMaterial({ vertexColors: true, roughness: 1, side: DoubleSide }),
    }),
    [],
  )
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res])

  useLayoutEffect(() => {
    for (const [mesh, list] of [
      [rails.current, railMatrices],
      [sleepers.current, sleeperMatrices],
    ] as const) {
      if (!mesh) continue
      list.forEach((m, i) => mesh.setMatrixAt(i, m))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  }, [railMatrices, sleeperMatrices])

  return (
    <group name="Railway">
      <mesh geometry={res.ballastGeo} material={res.ballastMat} receiveShadow />
      <instancedMesh ref={rails} args={[res.railGeo, res.railMat, railMatrices.length]} />
      <instancedMesh ref={sleepers} args={[res.sleeperGeo, res.sleeperMat, sleeperMatrices.length]} receiveShadow />
      {portals.map((p) => (
        <TunnelPortal key={p.s} portal={p} />
      ))}
      <RailSignals />
    </group>
  )
}
