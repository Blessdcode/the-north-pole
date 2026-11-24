import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { type BufferGeometry, Group, Material, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { EXPRESS_PHASES, inWorkshopHall, trainFrontS, trainState } from '../../../cinematic/express-timeline'
import { journey } from '../../../cinematic/journey'
import { emitStoryEvent } from '../../../cinematic/story-events'
import { chapterLocal } from '../../../config/destinations'
import { clamp, damp } from '../../../lib/math'
import { PARTICLE, emitParticles } from '../../systems/particles/steam-emitter'
import { coverAt, TUNNEL_DEPTH } from '../../world/geography'
import { railPointAt } from '../../world/railway-path'
import { Headlight, type HeadlightHandle } from './Headlight'
import { buildCarriageBody, buildLocomotiveBody, buildTenderBody, LOCO } from './rolling-stock'
import { buildPlainWheel, buildSpokedWheel, createNameplateTexture, createTrainMaterials, type TrainMat } from './train-kit'

/**
 * The Christmas Express — locomotive, tender and three carriages.
 * Its position is a pure function of journey progress (express-timeline),
 * so scrolling backwards runs the whole scene in reverse, wheels included.
 */
interface VehicleSpec {
  kind: 'loco' | 'tender' | 'carriage'
  length: number
  /** Distance from the train's front to this vehicle's front. */
  offset: number
  last?: boolean
}

const VEHICLES: VehicleSpec[] = [
  { kind: 'loco', length: LOCO.length, offset: 0 },
  { kind: 'tender', length: 7.6, offset: 14.0 },
  { kind: 'carriage', length: 16.4, offset: 22.0 },
  { kind: 'carriage', length: 16.4, offset: 38.9 },
  { kind: 'carriage', length: 16.4, offset: 55.8, last: true },
]

function StaticBody({ parts, materials }: { parts: { mat: TrainMat; geometry: BufferGeometry }[]; materials: Record<TrainMat, Material> }) {
  return (
    <>
      {parts.map((p) => (
        <mesh key={p.mat} geometry={p.geometry} material={materials[p.mat]} castShadow={false} />
      ))}
    </>
  )
}

export function Train() {
  const root = useRef<Group>(null)
  const vehicles = useRef<(Group | null)[]>([])
  const drivers = useRef<(Mesh | null)[]>([])
  const smallWheels = useRef<Mesh[]>([])
  const rods = useRef<{ coupling: (Mesh | null)[]; connecting: (Mesh | null)[]; crosshead: (Mesh | null)[]; piston: (Mesh | null)[] }>({
    coupling: [],
    connecting: [],
    crosshead: [],
    piston: [],
  })
  const headlight = useRef<HeadlightHandle | null>(null)

  const res = useMemo(() => {
    const plate = createNameplateTexture('NORTH STAR')
    const materials = createTrainMaterials(plate)
    const wheelMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.6 })
    return {
      plate,
      materials,
      wheelMat,
      loco: buildLocomotiveBody(),
      tender: buildTenderBody(),
      carriage: buildCarriageBody(false),
      lastCarriage: buildCarriageBody(true),
      driverGeo: buildSpokedWheel(LOCO.driverRadius, LOCO.crank),
      leadGeo: buildPlainWheel(LOCO.leadRadius),
      trailGeo: buildPlainWheel(LOCO.trailRadius),
      bogieWheelGeo: buildPlainWheel(0.45),
    }
  }, [])

  useEffect(
    () => () => {
      res.plate.dispose()
      Object.values(res.materials).forEach((m) => m.dispose())
      res.wheelMat.dispose()
      ;[res.loco, res.tender, res.carriage, res.lastCarriage].forEach((parts) => parts.forEach((p) => p.geometry.dispose()))
      ;[res.driverGeo, res.leadGeo, res.trailGeo, res.bogieWheelGeo].forEach((g) => g.dispose())
    },
    [res],
  )

  const sim = useMemo(
    () => ({
      a: new Vector3(),
      b: new Vector3(),
      v: new Vector3(),
      w: new Vector3(),
      prevS: Number.NaN,
      speed: 0,
      chuffIndex: 0,
      clatterIndex: 0,
      prevLocal: 0,
      idleTimer: 0,
      camPos: new Vector3(),
    }),
    [],
  )

  useFrame(({ clock, camera }, rawDt) => {
    const dt = Math.min(Math.max(rawDt, 1e-4), 0.1)
    const time = clock.elapsedTime
    const sFront = trainFrontS(journey.progress)
    const local = chapterLocal(journey.progress, 'express')

    // Speed (m/s), smoothed; derived from motion so it is exact under scrubbing.
    if (Number.isNaN(sim.prevS)) sim.prevS = sFront
    const rawSpeed = (sFront - sim.prevS) / dt
    sim.prevS = sFront
    sim.speed = damp(sim.speed, rawSpeed, 6, dt)
    const speed = sim.speed
    const absSpeed = Math.abs(speed)

    // Place every vehicle on the rail from two bogie points.
    VEHICLES.forEach((v, i) => {
      const g = vehicles.current[i]
      if (!g) return
      const centre = sFront - v.offset - v.length / 2
      railPointAt(centre + v.length * 0.3, sim.a)
      railPointAt(centre - v.length * 0.3, sim.b)
      g.position.copy(sim.a).add(sim.b).multiplyScalar(0.5)
      g.lookAt(sim.a)
    })

    // Wheels and valve gear.
    const angle = sFront / LOCO.driverRadius
    trainState.s = sFront
    trainState.speed = speed
    trainState.wheelAngle = angle
    trainState.local = local
    drivers.current.forEach((m, i) => {
      if (!m) return
      const right = i % 2 === 1
      // Quartering: right-hand cranks lead the left by 90°.
      const phase = right ? Math.PI / 2 : 0
      m.rotation.x = right ? -(angle + phase) : angle + phase
    })
    for (const w of smallWheels.current) w.rotation.x = sFront / (w.userData.wheelRadius as number)
    for (const side of [0, 1]) {
      const sx = side === 0 ? -1 : 1
      const phase = side === 1 ? Math.PI / 2 : 0
      const th = angle + phase
      const cy = Math.cos(th) * LOCO.crank
      const cz = Math.sin(th) * LOCO.crank
      const coupling = rods.current.coupling[side]
      if (coupling) coupling.position.set(sx * 1.02, LOCO.driverRadius + cy, LOCO.driverZ[1] + cz)
      // Connecting rod from the middle crank pin to the crosshead.
      const pinY = LOCO.driverRadius + cy
      const pinZ = LOCO.driverZ[1] + cz
      const dy = LOCO.cylinderY - pinY
      const headZ = pinZ + Math.sqrt(LOCO.rodLength ** 2 - dy * dy)
      const conn = rods.current.connecting[side]
      if (conn) {
        conn.position.set(sx * 1.1, (pinY + LOCO.cylinderY) / 2, (pinZ + headZ) / 2)
        conn.rotation.x = -Math.atan2(dy, headZ - pinZ)
      }
      const head = rods.current.crosshead[side]
      if (head) head.position.set(sx * 1.1, LOCO.cylinderY, headZ)
      const piston = rods.current.piston[side]
      if (piston) {
        const len = 3.85 - headZ
        piston.position.set(sx * 1.22, LOCO.cylinderY, headZ + len / 2)
        piston.scale.z = Math.max(0.05, len)
      }
    }

    // Lighting: lamp on whenever the Express is in its chapter and out in the open.
    const loco = vehicles.current[0]
    const inTunnel = coverAt(sFront) > TUNNEL_DEPTH && !inWorkshopHall(sFront - 6)
    headlight.current?.setIntensity(local > 0 && !inTunnel ? clamp(local / 0.02, 0, 1) : 0)
    if (root.current) root.current.visible = local > 0 || chapterLocal(journey.progress, 'arrival') > 0.6

    // Proximity to camera for sound mixing.
    camera.getWorldPosition(sim.camPos)
    const dist = loco ? loco.position.distanceTo(sim.camPos) : 999
    const proximity = inTunnel ? 0.15 : Math.pow(clamp(1 - dist / 420, 0, 1), 1.4)
    trainState.proximity = proximity

    if (!loco || local <= 0) {
      sim.prevLocal = local
      return
    }

    const chimneyOpen = !inTunnel
    const world = (x: number, y: number, z: number) => loco.localToWorld(sim.w.set(x, y, z))

    // Exhaust beats: four per driving-wheel revolution.
    const beat = Math.floor(angle / (Math.PI / 2))
    if (beat !== sim.chuffIndex) {
      sim.chuffIndex = beat
      if (absSpeed > 0.4) {
        const intensity = clamp(absSpeed / 14, 0.15, 1)
        if (chimneyOpen) {
          const c = world(...LOCO.chimneyTop)
          emitParticles(time, PARTICLE.SMOKE, c.x, c.y, c.z, 0, 5 + intensity * 7, 0, 4 + Math.round(intensity * 5), 1.2)
        }
        emitStoryEvent('train:chuff', { intensity, proximity })
      }
    }
    // Rail joints every 18 m.
    const joint = Math.floor(sFront / 18)
    if (joint !== sim.clatterIndex) {
      sim.clatterIndex = joint
      if (absSpeed > 1) emitStoryEvent('train:clatter', { intensity: clamp(absSpeed / 16, 0.1, 1), proximity })
    }

    // Idle breathing at the chimney.
    sim.idleTimer += dt
    if (chimneyOpen && sim.idleTimer > 0.22) {
      sim.idleTimer = 0
      const c = world(...LOCO.chimneyTop)
      emitParticles(time, PARTICLE.SMOKE, c.x, c.y, c.z, 0, 1.6, 0, 1, 0.5)
    }

    // Drain cocks while braking in and pulling away; safety valve while standing.
    const braking = local > EXPRESS_PHASES.arrive - 0.05 && local < EXPRESS_PHASES.arrive + 0.03
    const starting = local > EXPRESS_PHASES.depart - 0.01 && local < EXPRESS_PHASES.depart + 0.1
    const standing = local > EXPRESS_PHASES.arrive + 0.02 && local < EXPRESS_PHASES.depart - 0.02
    if (chimneyOpen && (braking || starting)) {
      const n = Math.max(1, Math.round(60 * dt))
      for (const sx of [-1, 1]) {
        const p = world(sx * 1.25, 1.2, LOCO.cylinderZ + 0.6)
        const out = sim.v.set(sx * 7, 0.4, 1.5).applyQuaternion(loco.quaternion)
        emitParticles(time, PARTICLE.JET, p.x, p.y, p.z, out.x, out.y, out.z, n, 1.6)
      }
    }
    if (chimneyOpen && standing && Math.random() < dt * 14) {
      const p = world(...LOCO.dome)
      emitParticles(time, PARTICLE.JET, p.x, p.y, p.z, 0, 9, 0, 2, 1.2)
    }

    // Powder snow thrown up by the pilot and wheels.
    if (chimneyOpen && absSpeed > 3) {
      const n = Math.min(10, Math.round(absSpeed * dt * 9))
      if (n > 0) {
        const p = world(...LOCO.pilot)
        const fwd = sim.v.set(0, 0, 1).applyQuaternion(loco.quaternion).multiplyScalar(speed * 0.55)
        emitParticles(time, PARTICLE.SNOW, p.x, p.y, p.z, fwd.x, 2.5 + absSpeed * 0.12, fwd.z, n, 3.2)
      }
    }

    // Story moments (forward direction only, so scrubbing back stays quiet).
    const crossed = (mark: number) => sim.prevLocal < mark && local >= mark
    if (crossed(0.02)) emitStoryEvent('train:whistle', { proximity: 0.25, muffled: true })
    if (crossed(EXPRESS_PHASES.arrive - 0.02)) emitStoryEvent('train:hiss', { seconds: 2.6, proximity })
    if (crossed(EXPRESS_PHASES.depart - 0.025)) {
      emitStoryEvent('train:whistle', { proximity, muffled: false })
      const p = world(...LOCO.whistle)
      emitParticles(time, PARTICLE.JET, p.x, p.y, p.z, 0, 7, 0, 18, 0.8)
    }
    if (crossed(EXPRESS_PHASES.depart + 0.005)) emitStoryEvent('train:hiss', { seconds: 3.2, proximity })
    if (crossed(0.88)) emitStoryEvent('train:whistle', { proximity, muffled: false })
    sim.prevLocal = local
  }, -1)

  // Collect the free-rolling wheels once they exist (tagged with their radius).
  useEffect(() => {
    const list: Mesh[] = []
    root.current?.traverse((o) => {
      if ((o as Mesh).isMesh && typeof o.userData.wheelRadius === 'number') list.push(o as Mesh)
    })
    smallWheels.current = list
  }, [])

  const sides = [-1, 1]

  return (
    <group ref={root} name="ChristmasExpress">
      {VEHICLES.map((v, i) => (
        <group key={i} ref={(g) => void (vehicles.current[i] = g)}>
          {v.kind === 'loco' && (
            <>
              <StaticBody parts={res.loco} materials={res.materials} />
              {LOCO.driverZ.flatMap((z, wi) =>
                sides.map((sx, si) => (
                  <group key={`d${wi}${si}`} position={[sx * LOCO.driverX, LOCO.driverRadius, z]} rotation-y={sx > 0 ? Math.PI : 0}>
                    <mesh
                      ref={(m) => void (drivers.current[wi * 2 + si] = m)}
                      geometry={res.driverGeo}
                      material={res.wheelMat}
                    />
                  </group>
                )),
              )}
              {sides.map((sx) => (
                <group key={`small${sx}`}>
                  <mesh
                    userData={{ wheelRadius: LOCO.leadRadius }}
                    geometry={res.leadGeo}
                    material={res.materials.black}
                    position={[sx * 0.84, LOCO.leadRadius, LOCO.leadZ]}
                  />
                  <mesh
                    userData={{ wheelRadius: LOCO.trailRadius }}
                    geometry={res.trailGeo}
                    material={res.materials.black}
                    position={[sx * 0.84, LOCO.trailRadius, LOCO.trailZ]}
                  />
                </group>
              ))}
              {/* Motion work: coupling rods, connecting rods, crossheads, piston rods. */}
              {[0, 1].map((side) => (
                <group key={`rods${side}`}>
                  <mesh ref={(m) => void (rods.current.coupling[side] = m)} material={res.materials.steel}>
                    <boxGeometry args={[0.09, 0.17, 4.75]} />
                  </mesh>
                  <mesh ref={(m) => void (rods.current.connecting[side] = m)} material={res.materials.steel}>
                    <boxGeometry args={[0.1, 0.2, LOCO.rodLength + 0.2]} />
                  </mesh>
                  <mesh ref={(m) => void (rods.current.crosshead[side] = m)} material={res.materials.brass}>
                    <boxGeometry args={[0.2, 0.3, 0.42]} />
                  </mesh>
                  <mesh ref={(m) => void (rods.current.piston[side] = m)} material={res.materials.steel}>
                    <boxGeometry args={[0.07, 0.07, 1]} />
                  </mesh>
                </group>
              ))}
              <Headlight position={LOCO.lamp} handle={headlight} />
            </>
          )}
          {v.kind === 'tender' && (
            <>
              <StaticBody parts={res.tender} materials={res.materials} />
              {[-3.05, -1.55, 1.55, 3.05].flatMap((z) =>
                sides.map((sx) => (
                  <mesh
                    key={`t${z}${sx}`}
                    userData={{ wheelRadius: 0.45 }}
                    geometry={res.bogieWheelGeo}
                    material={res.materials.black}
                    position={[sx * 0.8, 0.45, z]}
                  />
                )),
              )}
            </>
          )}
          {v.kind === 'carriage' && (
            <>
              <StaticBody parts={v.last ? res.lastCarriage : res.carriage} materials={res.materials} />
              {[-6.4, -4.8, 4.8, 6.4].flatMap((z) =>
                sides.map((sx) => (
                  <mesh
                    key={`c${z}${sx}`}
                    userData={{ wheelRadius: 0.45 }}
                    geometry={res.bogieWheelGeo}
                    material={res.materials.black}
                    position={[sx * 0.8, 0.45, z]}
                  />
                )),
              )}
            </>
          )}
        </group>
      ))}
    </group>
  )
}
