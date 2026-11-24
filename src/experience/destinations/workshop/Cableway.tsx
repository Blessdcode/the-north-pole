import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  TubeGeometry,
  Vector3,
} from 'three'
import { heightAt } from '../../world/geography'
import { CABLE_ANCHORS, CABLE_POINTS, TERMINAL } from './workshop-layout'

/**
 * The Gift Line: a cableway from the Workshop's balcony down over the frozen
 * forest to a terminal beside the clock plaza. A steady procession of gondolas
 * carries finished gifts toward the Great Clock.
 */
const CARS = 12
const CAR_SPEED = 3.2

export function Cableway() {
  const cars = useRef<InstancedMesh>(null)
  const gifts = useRef<InstancedMesh>(null)
  const terminalWheel = useRef<Group>(null)

  const res = useMemo(() => {
    const curve = new CatmullRomCurve3(CABLE_POINTS, false, 'centripetal')
    const len = curve.getLength()
    return {
      curve,
      len,
      cableGeo: new TubeGeometry(curve, 320, 0.09, 5, false),
      carGeo: new BoxGeometry(1.7, 0.28, 1.7),
      giftGeo: new BoxGeometry(1, 0.8, 1),
      iron: new MeshStandardMaterial({ color: '#1d1f22', roughness: 0.5, metalness: 0.75 }),
      red: new MeshStandardMaterial({ color: '#8a0c12', roughness: 0.4, metalness: 0.4 }),
      giftMat: new MeshStandardMaterial({ roughness: 0.5 }),
      timber: new MeshStandardMaterial({ color: '#4a2f1c', roughness: 0.8 }),
      snow: new MeshStandardMaterial({ color: '#e6edfb', roughness: 1 }),
      lamp: new MeshBasicMaterial({ color: new Color(6, 3.6, 1.6), toneMapped: false }),
    }
  }, [])
  useEffect(
    () => () => {
      ;[res.cableGeo, res.carGeo, res.giftGeo, res.iron, res.red, res.giftMat, res.timber, res.snow, res.lamp].forEach((r) => r.dispose())
    },
    [res],
  )

  const colors = useMemo(() => ['#b3121b', '#1f6b35', '#d9b04a', '#1b3f8a', '#f2efe6', '#7a1c4a'].map((c) => new Color(c)), [])
  const tmp = useMemo(() => ({ o: new Object3D(), p: new Vector3(), q: new Vector3() }), [])

  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    const cm = cars.current
    const gm = gifts.current
    if (!cm || !gm) return
    for (let i = 0; i < CARS; i++) {
      // Cars run continuously; the very first and last stretch are inside the stations.
      const u = ((time * CAR_SPEED + (i * res.len) / CARS) % res.len) / res.len
      res.curve.getPointAt(u, tmp.p)
      res.curve.getTangentAt(Math.min(u, 0.999), tmp.q)
      const yaw = Math.atan2(tmp.q.x, tmp.q.z)
      const sway = Math.sin(time * 1.1 + i) * 0.05
      tmp.o.position.set(tmp.p.x, tmp.p.y - 3.2, tmp.p.z)
      tmp.o.rotation.set(0, yaw, sway)
      tmp.o.scale.setScalar(1)
      tmp.o.updateMatrix()
      cm.setMatrixAt(i, tmp.o.matrix)
      tmp.o.position.y += 0.55
      tmp.o.updateMatrix()
      gm.setMatrixAt(i, tmp.o.matrix)
      gm.setColorAt(i, colors[i % colors.length])
    }
    cm.instanceMatrix.needsUpdate = true
    gm.instanceMatrix.needsUpdate = true
    if (gm.instanceColor) gm.instanceColor.needsUpdate = true
    if (terminalWheel.current) terminalWheel.current.rotation.y = -time * 0.35
  })

  const pylons = CABLE_ANCHORS.slice(1, -1)
  const term = CABLE_ANCHORS[CABLE_ANCHORS.length - 1]

  return (
    <group name="GiftLine">
      <mesh geometry={res.cableGeo} material={res.iron} />
      <instancedMesh ref={cars} args={[res.carGeo, res.red, CARS]} frustumCulled={false} />
      <instancedMesh ref={gifts} args={[res.giftGeo, res.giftMat, CARS]} frustumCulled={false} />
      {/* Pylons: tapered lattice-like towers with a crossarm and a lantern */}
      {pylons.map((p, i) => {
        const ground = heightAt(p.x, p.z)
        const h = p.y - ground + 1.5
        return (
          <group key={i} position={[p.x, ground, p.z]}>
            {[-1, 1].map((s) => (
              <mesh key={s} material={res.iron} position={[s * 1.2, h / 2, 0]} rotation-z={s * -0.05}>
                <boxGeometry args={[0.35, h, 0.35]} />
              </mesh>
            ))}
            {Array.from({ length: Math.floor(h / 5) }, (_, k) => (
              <mesh key={k} material={res.iron} position={[0, 4 + k * 5, 0]} rotation-z={k % 2 ? 0.6 : -0.6}>
                <boxGeometry args={[0.12, 3.2, 0.12]} />
              </mesh>
            ))}
            <mesh material={res.iron} position={[0, h - 1.2, 0]}>
              <boxGeometry args={[4.6, 0.4, 0.5]} />
            </mesh>
            <mesh material={res.snow} position={[0, h - 0.95, 0]}>
              <boxGeometry args={[4.6, 0.12, 0.55]} />
            </mesh>
            <mesh material={res.lamp} position={[0, h - 2, 0.4]}>
              <sphereGeometry args={[0.35, 10, 8]} />
            </mesh>
          </group>
        )
      })}
      {/* Village terminal beside the clock plaza */}
      <group position={[TERMINAL.x, TERMINAL.y, TERMINAL.z]}>
        {[
          [-3, -3],
          [3, -3],
          [-3, 3],
          [3, 3],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} material={res.timber} position={[x, 9, z]}>
            <boxGeometry args={[0.6, 18, 0.6]} />
          </mesh>
        ))}
        <mesh material={res.red} position={[0, 18.3, 0]}>
          <boxGeometry args={[8.4, 0.5, 8.4]} />
        </mesh>
        <mesh material={res.snow} position={[0, 18.7, 0]}>
          <boxGeometry args={[8.2, 0.3, 8.2]} />
        </mesh>
        <group ref={terminalWheel} position={[term.x - TERMINAL.x, term.y - TERMINAL.y - 0.6, term.z - TERMINAL.z]}>
          <mesh material={res.iron} rotation-x={Math.PI / 2}>
            <torusGeometry args={[2.2, 0.16, 8, 32]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} material={res.iron} rotation-y={(i * Math.PI) / 4}>
              <boxGeometry args={[4.4, 0.12, 0.12]} />
            </mesh>
          ))}
        </group>
        {[-1, 1].map((s) => (
          <mesh key={s} material={res.lamp} position={[s * 4.4, 16.5, 4.4]}>
            <sphereGeometry args={[0.4, 10, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
