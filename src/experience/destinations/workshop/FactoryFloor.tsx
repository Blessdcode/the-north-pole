import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { journey } from '../../../cinematic/journey'
import { chapterLocal } from '../../../config/destinations'
import { mulberry32 } from '../../../lib/math'
import { PARTICLE, emitParticles } from '../../systems/particles/steam-emitter'
import { buildElfGeometry, buildGearGeometry, buildRibbonGeometry, createBeltTexture, createPaperTexture } from './workshop-assets'
import { BELT, BOW_X, HALL, heroGiftDistance, routePointAt, WRAP_X } from './workshop-layout'
import { workshopState } from './workshop-state'

const F = HALL.floor
const BELT_LEN = BELT.end - BELT.start
const SPACING = 3.6
const PER_LINE = Math.floor(BELT_LEN / SPACING)
const KRAFT = new Color('#9a6a3c')
const PAPER = ['#b3121b', '#1f6b35', '#d9b04a', '#1b3f8a', '#f2efe6', '#7a1c4a'].map((c) => new Color(c))
const RIBBON = ['#f2d27a', '#f5f5f0', '#c8141c', '#e7c35a', '#1f6b35', '#f2d27a'].map((c) => new Color(c))

/** A robotic arm: base, turret, upper arm, forearm, claw. Joints animated by the floor. */
interface Arm {
  turret: Group | null
  shoulder: Group | null
  elbow: Group | null
  claw: Group | null
}

function RoboticArm({ arm, position, facing }: { arm: Arm; position: [number, number, number]; facing: number }) {
  return (
    <group position={position} rotation-y={facing}>
      <mesh position-y={0.4}>
        <cylinderGeometry args={[0.7, 0.9, 0.8, 16]} />
        <meshStandardMaterial color="#8a0c12" roughness={0.4} metalness={0.4} />
      </mesh>
      <group ref={(g) => void (arm.turret = g)} position-y={0.8}>
        <mesh position-y={0.35}>
          <cylinderGeometry args={[0.5, 0.55, 0.7, 14]} />
          <meshStandardMaterial color="#d2a24f" roughness={0.3} metalness={0.9} />
        </mesh>
        <group ref={(g) => void (arm.shoulder = g)} position-y={0.75}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[0.36, 2.4, 0.36]} />
            <meshStandardMaterial color="#e9e2d0" roughness={0.45} metalness={0.2} />
          </mesh>
          <group ref={(g) => void (arm.elbow = g)} position-y={2.4}>
            <mesh rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.28, 0.28, 0.5, 12]} />
              <meshStandardMaterial color="#d2a24f" roughness={0.3} metalness={0.9} />
            </mesh>
            <mesh position={[0, 0, 0.95]} rotation-x={Math.PI / 2}>
              <boxGeometry args={[0.28, 1.9, 0.28]} />
              <meshStandardMaterial color="#e9e2d0" roughness={0.45} metalness={0.2} />
            </mesh>
            <group ref={(g) => void (arm.claw = g)} position={[0, -0.05, 1.95]}>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.16, -0.25, 0]}>
                  <boxGeometry args={[0.08, 0.5, 0.18]} />
                  <meshStandardMaterial color="#1d1f22" metalness={0.7} roughness={0.4} />
                </mesh>
              ))}
              <mesh position-y={0.02}>
                <sphereGeometry args={[0.13, 10, 8]} />
                <meshBasicMaterial color={new Color(0.4, 3, 1.2)} toneMapped={false} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

export function FactoryFloor() {
  const presents = useRef<InstancedMesh>(null)
  const ribbons = useRef<InstancedMesh>(null)
  const elves = useRef<InstancedMesh>(null)
  const gears = useRef<(Mesh | null)[]>([])
  const rolls = useRef<(Mesh | null)[]>([])

  const res = useMemo(() => {
    const belt = createBeltTexture()
    belt.repeat.set(BELT_LEN / 2, 1)
    const papers = [createPaperTexture('#b3121b', '#f2d27a'), createPaperTexture('#1f6b35', '#f5f5f0'), createPaperTexture('#d9b04a', '#b3121b')]
    return {
      belt,
      papers,
      present: new BoxGeometry(1, 1, 1),
      ribbon: buildRibbonGeometry(),
      elf: buildElfGeometry(),
      presentMat: new MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }),
      ribbonMat: new MeshStandardMaterial({ roughness: 0.3, metalness: 0.4 }),
      elfMat: new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
      beltMat: new MeshStandardMaterial({ map: belt, roughness: 0.85 }),
      frameMat: new MeshStandardMaterial({ color: '#23262b', roughness: 0.5, metalness: 0.7 }),
      brass: new MeshStandardMaterial({ color: '#d2a24f', roughness: 0.3, metalness: 0.9 }),
      copper: new MeshStandardMaterial({ color: '#b5643a', roughness: 0.35, metalness: 0.9 }),
      red: new MeshStandardMaterial({ color: '#8a0c12', roughness: 0.35, metalness: 0.35 }),
      timber: new MeshStandardMaterial({ color: '#5a3820', roughness: 0.8 }),
      gearMat: new MeshStandardMaterial({ color: '#7d6a4a', roughness: 0.4, metalness: 0.85 }),
      glow: new MeshBasicMaterial({ color: new Color(5, 3, 1.3), toneMapped: false }),
      paperMats: papers.map((map) => new MeshStandardMaterial({ map, roughness: 0.6 })),
      gearGeos: [buildGearGeometry(7, 28, 1.2), buildGearGeometry(4.2, 17, 1.2), buildGearGeometry(9, 36, 1.4), buildGearGeometry(3, 12, 1)],
      rollGeo: new CylinderGeometry(0.75, 0.75, 3.6, 24),
      legGeo: new BoxGeometry(0.14, 0.9, 0.14),
      shelfGeo: new BoxGeometry(16, 0.2, 3),
    }
  }, [])

  useEffect(
    () => () => {
      Object.values(res).forEach((v) => {
        if (Array.isArray(v)) v.forEach((t) => t.dispose())
        else v.dispose()
      })
    },
    [res],
  )

  // Static per-slot attributes: size and colours.
  const slots = useMemo(() => {
    const rand = mulberry32(77)
    return Array.from({ length: PER_LINE * BELT.lines.length }, () => ({
      size: new Vector3(0.6 + rand() * 0.5, 0.45 + rand() * 0.45, 0.6 + rand() * 0.45),
      paper: Math.floor(rand() * PAPER.length),
      yaw: (rand() - 0.5) * 0.3,
    }))
  }, [])

  // Elves: at the assembly benches, by the racks, and a few walking the aisles.
  const elfSpots = useMemo(() => {
    const rand = mulberry32(13)
    const spots: { x: number; z: number; yaw: number; walk: number; phase: number }[] = []
    for (const z of BELT.lines) {
      for (let x = BELT.start + 3; x < BELT.start + 30; x += 4.5) {
        spots.push({ x, z: z + 1.8, yaw: Math.PI, walk: 0, phase: rand() * 6 })
        if (rand() < 0.6) spots.push({ x: x + 1.5, z: z - 1.8, yaw: 0, walk: 0, phase: rand() * 6 })
      }
      spots.push({ x: BOW_X - 6, z: z + 2, yaw: Math.PI, walk: 0, phase: rand() * 6 })
    }
    for (let x = HALL.west + 20; x < HALL.east - 20; x += 11) spots.push({ x, z: -118 + rand() * 6, yaw: rand() * 6, walk: 0, phase: rand() * 6 })
    for (let i = 0; i < 8; i++) spots.push({ x: HALL.west + 30 + i * 16, z: -152, yaw: 0, walk: 7 + rand() * 6, phase: rand() * 6 })
    return spots
  }, [])

  const arms = useMemo<Arm[]>(() => Array.from({ length: 6 }, () => ({ turret: null, shoulder: null, elbow: null, claw: null })), [])
  const armSpecs = useMemo(
    () => [
      ...BELT.lines.map((z) => ({ x: BOW_X, z: z - 2.6, facing: 0, line: z, kind: 'bow' as const })),
      ...BELT.lines.map((z) => ({ x: BELT.start + 34, z: z + 2.6, facing: Math.PI, line: z, kind: 'pick' as const })),
    ],
    [],
  )

  const statics = useMemo(() => {
    const o = new Object3D()
    const legs: Matrix4[] = []
    for (const z of BELT.lines) {
      for (let x = BELT.start + 2; x < BELT.end; x += 6) {
        for (const s of [-0.7, 0.7]) {
          o.position.set(x, F + 0.45, z + s)
          o.updateMatrix()
          legs.push(o.matrix.clone())
        }
      }
    }
    const shelves: Matrix4[] = []
    const rackGifts: Matrix4[] = []
    const rackColors: Color[] = []
    for (let i = 0; i < 6; i++) {
      const rx = HALL.west + 30 + i * 22
      const rz = HALL.north + 4
      for (const y of [0, 2.2, 4.4, 6.6]) {
        o.position.set(rx, F + y + 0.1, rz)
        o.scale.set(1, 1, 1)
        o.updateMatrix()
        shelves.push(o.matrix.clone())
      }
      for (let k = 0; k < 24; k++) {
        o.position.set(rx - 7 + (k % 8) * 2, F + 0.75 + Math.floor(k / 8) * 2.2, rz + ((k * 7) % 3) - 1)
        o.scale.set(1.2 + (k % 3) * 0.2, 1.1, 1.1)
        o.updateMatrix()
        rackGifts.push(o.matrix.clone())
        rackColors.push(PAPER[(k + i) % PAPER.length])
      }
    }
    return { legs, shelves, rackGifts, rackColors }
  }, [])
  const legsRef = useRef<InstancedMesh>(null)
  const shelvesRef = useRef<InstancedMesh>(null)
  const rackRef = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const fill = (m: InstancedMesh | null, list: Matrix4[], colors?: Color[]) => {
      if (!m) return
      list.forEach((mat, i) => {
        m.setMatrixAt(i, mat)
        if (colors) m.setColorAt(i, colors[i])
      })
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      m.computeBoundingSphere()
    }
    fill(legsRef.current, statics.legs)
    fill(shelvesRef.current, statics.shelves)
    fill(rackRef.current, statics.rackGifts, statics.rackColors)
  }, [statics])

  const tmp = useMemo(() => ({ o: new Object3D(), c: new Color(), hero: new Vector3(), m: new Matrix4() }), [])

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const time = clock.elapsedTime
    workshopState.boost = Math.max(0, workshopState.boost - dt * 0.12)
    const boost = workshopState.boost
    const speed = BELT.speed * (1 + boost * 1.6)
    workshopState.beltPhase += dt * speed
    const phase = workshopState.beltPhase
    res.belt.offset.x = -(phase / 2) % 1

    // Keep line 2 clear around the hero gift while it rides the belt.
    const t = chapterLocal(journey.progress, 'workshop')
    const heroD = heroGiftDistance(t)
    routePointAt(heroD, tmp.hero)
    const heroOnBelt = tmp.hero.x < BELT.end + 2 && Math.abs(tmp.hero.z - BELT.lines[1]) < 1

    const pm = presents.current
    const rm = ribbons.current
    if (pm && rm) {
      const { o, c } = tmp
      let k = 0
      BELT.lines.forEach((z, li) => {
        for (let i = 0; i < PER_LINE; i++, k++) {
          const slot = slots[k]
          const x = BELT.start + ((phase + i * SPACING + li * 1.3) % BELT_LEN)
          const hidden = (heroOnBelt && li === 1 && Math.abs(x - tmp.hero.x) < 2.6) || x > BELT.end - 1.5
          const s = slot.size
          o.position.set(x, BELT.top + s.y / 2, z)
          o.rotation.set(0, slot.yaw, 0)
          o.scale.copy(s).multiplyScalar(hidden ? 0 : 1)
          o.updateMatrix()
          pm.setMatrixAt(k, o.matrix)
          const wrapped = x > WRAP_X
          pm.setColorAt(k, wrapped ? PAPER[slot.paper] : KRAFT)
          const tied = x > BOW_X
          o.scale.copy(s).multiplyScalar(hidden || !tied ? 0 : 1)
          o.updateMatrix()
          rm.setMatrixAt(k, o.matrix)
          c.copy(RIBBON[slot.paper])
          rm.setColorAt(k, c)
        }
      })
      pm.instanceMatrix.needsUpdate = true
      rm.instanceMatrix.needsUpdate = true
      if (pm.instanceColor) pm.instanceColor.needsUpdate = true
      if (rm.instanceColor) rm.instanceColor.needsUpdate = true
    }

    // Robotic arms: bow arms dip each time a gift passes beneath; pick arms swing toys onto the belt.
    armSpecs.forEach((spec, i) => {
      const a = arms[i]
      if (!a.turret || !a.shoulder || !a.elbow || !a.claw) return
      const cycle = ((phase + (spec.kind === 'bow' ? 0.9 : 0.2)) % SPACING) / SPACING
      const dip = Math.sin(cycle * Math.PI * 2) * 0.5 + 0.5
      if (spec.kind === 'bow') {
        a.turret.rotation.y = Math.sin(time * 0.7 + i) * 0.15
        a.shoulder.rotation.x = 0.35 + dip * 0.35
        a.elbow.rotation.x = 0.9 + dip * 0.5
      } else {
        const swing = Math.sin(cycle * Math.PI * 2)
        a.turret.rotation.y = swing * 1.1
        a.shoulder.rotation.x = 0.3 + (1 - Math.abs(swing)) * 0.5
        a.elbow.rotation.x = 0.7 + Math.abs(swing) * 0.4
      }
      a.claw.rotation.z = Math.sin(time * 6 + i) * 0.1
    })

    // Gears turn at speeds set by their tooth counts (meshing pairs counter-rotate).
    const base = time * 0.25 * (1 + boost * 2)
    const teeth = [28, 17, 36, 12, 28, 17]
    gears.current.forEach((g, i) => {
      if (g) g.rotation.z = ((i % 2 ? -1 : 1) * base * 28) / teeth[i % teeth.length]
    })
    rolls.current.forEach((r, i) => {
      if (r) r.rotation.z = -phase * 0.9 * (i % 2 ? 1 : -1)
    })

    // Elves bob as they work; some walk the central aisle.
    const em = elves.current
    if (em) {
      const { o } = tmp
      elfSpots.forEach((e, i) => {
        const work = Math.sin(time * (3 + boost * 3) + e.phase)
        const walkX = e.walk ? Math.sin(time * 0.25 + e.phase) * e.walk : 0
        const dir = e.walk ? (Math.cos(time * 0.25 + e.phase) > 0 ? Math.PI / 2 : -Math.PI / 2) : e.yaw
        o.position.set(e.x + walkX, F + Math.abs(work) * (e.walk ? 0.08 : 0.04), e.z)
        o.rotation.set(e.walk ? 0 : work * 0.08, dir + (e.walk ? 0 : Math.sin(time * 0.5 + e.phase) * 0.3), 0)
        o.scale.setScalar(1)
        o.updateMatrix()
        em.setMatrixAt(i, o.matrix)
      })
      em.instanceMatrix.needsUpdate = true
    }

    // Steam valves puff occasionally (more under boost); machine sparkles while boosted.
    if (Math.random() < dt * (0.8 + boost * 4)) {
      const z = BELT.lines[Math.floor(Math.random() * 3)]
      emitParticles(time, PARTICLE.JET, WRAP_X + 1.5, F + 5.4, z, 0, 3 + boost * 3, 0, 3, 0.6)
    }
  })

  return (
    <group name="FactoryFloor">
      {/* Conveyor lines */}
      {BELT.lines.map((z) => (
        <group key={z}>
          <mesh material={res.frameMat} position={[(BELT.start + BELT.end) / 2, BELT.top - 0.2, z]}>
            <boxGeometry args={[BELT_LEN, 0.36, 1.7]} />
          </mesh>
          <mesh material={res.beltMat} position={[(BELT.start + BELT.end) / 2, BELT.top + 0.002, z]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[BELT_LEN, 1.4]} />
          </mesh>
          {[-0.82, 0.82].map((s) => (
            <mesh key={s} material={res.brass} position={[(BELT.start + BELT.end) / 2, BELT.top + 0.12, z + s]}>
              <boxGeometry args={[BELT_LEN, 0.08, 0.06]} />
            </mesh>
          ))}
          {/* Wrapping machine: open-ended housing, paper rolls, glowing slots */}
          <group position={[WRAP_X, BELT.top, z]}>
            {[-1, 1].map((s) => (
              <mesh key={s} material={res.red} position={[0, 1.6, s * 1.55]}>
                <boxGeometry args={[5, 3.6, 0.3]} />
              </mesh>
            ))}
            <mesh material={res.red} position={[0, 3.5, 0]}>
              <boxGeometry args={[5.4, 0.4, 3.5]} />
            </mesh>
            <mesh material={res.brass} position={[0, 3.75, 0]}>
              <boxGeometry args={[5.6, 0.12, 3.7]} />
            </mesh>
            {[-1.2, 1.2].map((x, i) => (
              <mesh
                key={x}
                ref={(m) => void (rolls.current[BELT.lines.indexOf(z) * 2 + i] = m)}
                geometry={res.rollGeo}
                material={res.paperMats[(BELT.lines.indexOf(z) + i) % 3]}
                position={[x, 4.7, 0]}
                rotation-x={Math.PI / 2}
              />
            ))}
            {[-1, 1].map((s) => (
              <mesh key={`slot${s}`} material={res.glow} position={[0, 2.1, s * 1.71]}>
                <boxGeometry args={[3.6, 0.25, 0.04]} />
              </mesh>
            ))}
            {[-1.6, 0, 1.6].map((x) =>
              [-1, 1].map((s) => (
                <mesh key={`port${x}${s}`} material={res.glow} position={[x, 2.9, s * 1.71]} rotation-x={Math.PI / 2}>
                  <cylinderGeometry args={[0.22, 0.22, 0.04, 14]} />
                </mesh>
              )),
            )}
          </group>
        </group>
      ))}
      <instancedMesh ref={legsRef} args={[res.legGeo, res.frameMat, statics.legs.length]} />
      <instancedMesh ref={presents} args={[res.present, res.presentMat, PER_LINE * BELT.lines.length]} frustumCulled={false} />
      <instancedMesh ref={ribbons} args={[res.ribbon, res.ribbonMat, PER_LINE * BELT.lines.length]} frustumCulled={false} />
      {/* Robotic arms */}
      {armSpecs.map((spec, i) => (
        <RoboticArm key={i} arm={arms[i]} position={[spec.x, F, spec.z]} facing={spec.facing} />
      ))}
      {/* Assembly benches with toys */}
      {BELT.lines.map((z) => (
        <group key={`bench${z}`}>
          {[1, -1].map((s) => (
            <mesh key={s} material={res.timber} position={[BELT.start + 16, F + 0.5, z + s * 2.4]}>
              <boxGeometry args={[28, 1, 1.4]} />
            </mesh>
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={`toy${i}`} position={[BELT.start + 5 + i * 3, F + 1.25, z + 2.4]}>
              {i % 3 === 0 ? <sphereGeometry args={[0.25, 12, 8]} /> : i % 3 === 1 ? <boxGeometry args={[0.5, 0.35, 0.3]} /> : <cylinderGeometry args={[0.22, 0.22, 0.35, 12]} />}
              <meshStandardMaterial color={PAPER[i % PAPER.length]} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Wall gears (south wall) and a pair on the north wall */}
      {[
        { x: -690, y: 14, r: 0, z: HALL.south + 1.2 },
        { x: -679, y: 9.2, r: 1, z: HALL.south + 1.2 },
        { x: -660, y: 16, r: 2, z: HALL.south + 1.2 },
        { x: -646, y: 8.5, r: 3, z: HALL.south + 1.2 },
        { x: -600, y: 15, r: 0, z: HALL.north - 1.2 },
        { x: -589, y: 10.2, r: 1, z: HALL.north - 1.2 },
      ].map((g, i) => (
        <mesh key={i} ref={(m) => void (gears.current[i] = m)} geometry={res.gearGeos[g.r]} material={res.gearMat} position={[g.x, F + g.y, g.z]} />
      ))}
      {/* Steam pipes along the south wall with valve wheels */}
      {[F + 6, F + 7.4].map((y, i) => (
        <mesh key={y} material={res.copper} position={[(HALL.west + HALL.east) / 2, y, HALL.south + 2.4 + i * 0.9]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.32, 0.32, HALL.east - HALL.west - 4, 12]} />
        </mesh>
      ))}
      {BELT.lines.map((z) => (
        <group key={`drop${z}`}>
          <mesh material={res.copper} position={[WRAP_X + 1.5, F + 5.6, z]}>
            <cylinderGeometry args={[0.18, 0.18, 1.6, 10]} />
          </mesh>
          <mesh material={res.red} position={[WRAP_X + 1.5, F + 6.5, z]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.35, 0.06, 6, 16]} />
          </mesh>
        </group>
      ))}
      {/* Gift racks along the north wall */}
      <instancedMesh ref={shelvesRef} args={[res.shelfGeo, res.timber, statics.shelves.length]} />
      <instancedMesh ref={rackRef} args={[res.present, res.presentMat, statics.rackGifts.length]} />
      <instancedMesh ref={elves} args={[res.elf, res.elfMat, elfSpots.length]} frustumCulled={false} />
    </group>
  )
}

