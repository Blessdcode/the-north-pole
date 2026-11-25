import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { journey } from '../../../cinematic/journey'
import { emitStoryEvent } from '../../../cinematic/story-events'
import { chapterLocal } from '../../../config/destinations'
import { hotspotAnchors } from '../../../interaction/hotspots/hotspot-anchors'
import { clamp, damp } from '../../../lib/math'
import { PARTICLE, emitParticles } from '../../systems/particles/steam-emitter'
import {
  buildAntlerGeometry,
  buildBodyGeometry,
  buildCollarGeometry,
  buildEarGeometry,
  buildHeadGeometry,
  buildLowerLegGeometry,
  buildUpperLegGeometry,
  LEG,
} from './reindeer-geometry'
import { createFrame, flightLocal, frameAt, sleighDistance } from '../flight/flight-path'
import { santaState } from '../flight/santa-state'
import { TEAM, walkProgress } from './stables-layout'
import { nowSeconds, stablesState } from './stables-state'

/**
 * The eight reindeer. One frame loop animates the whole team:
 *   in the stall  – breathing (with visible breath), weight shifts, ear and tail
 *                   flicks, grazing, and turning to watch the camera go by
 *   walking out   – a four-beat walk locked to distance travelled, along a path
 *                   from the stall, up the aisle, past the sleigh, out of the doors
 *   in harness    – standing in pairs on the launch field, heads up, ready
 */
interface Rig {
  root: Group | null
  body: Group | null
  head: Group | null
  earL: Group | null
  earR: Group | null
  legs: { upper: Group | null; lower: Group | null }[]
}

const STRIDE = 1.5
const GALLOP_STRIDE = 3.4
/** Distance along the flight path from the sleigh to each pair (matches the harness slots). */
const PAIR_OFFSET = [14, 19, 24, 29]

export function Herd() {
  const rigs = useMemo<Rig[]>(
    () => TEAM.map(() => ({ root: null, body: null, head: null, earL: null, earR: null, legs: [0, 1, 2, 3].map(() => ({ upper: null, lower: null })) })),
    [],
  )
  const res = useMemo(
    () => ({
      material: new MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }),
      collarMat: new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }),
      body: buildBodyGeometry(),
      head: buildHeadGeometry(),
      ear: buildEarGeometry(),
      frontUpper: buildUpperLegGeometry(LEG.frontUpper, 0.1),
      backUpper: buildUpperLegGeometry(LEG.backUpper, 0.14),
      frontLower: buildLowerLegGeometry(LEG.frontLower),
      backLower: buildLowerLegGeometry(LEG.backLower),
      antlers: [buildAntlerGeometry(11), buildAntlerGeometry(23), buildAntlerGeometry(37)],
      collar: buildCollarGeometry(),
      strap: new BoxGeometry(1, 1, 1),
      leather: new MeshStandardMaterial({ color: '#3a1a0c', roughness: 0.55 }),
    }),
    [],
  )
  useEffect(
    () => () => {
      Object.values(res).forEach((v) => {
        if (Array.isArray(v)) v.forEach((g) => g.dispose())
        else v.dispose()
      })
    },
    [res],
  )

  const sim = useMemo(
    () => ({
      cam: new Vector3(),
      local: new Vector3(),
      inv: new Matrix4(),
      p: new Vector3(),
      tan: new Vector3(),
      nose: new Vector3(),
      look: TEAM.map(() => ({ yaw: 0, pitch: 0, prevBreath: 0, step: 0 })),
      frame: createFrame(),
      basis: new Matrix4(),
      xAxis: new Vector3(),
      collars: TEAM.map(() => new Vector3()),
      dash: [new Vector3(), new Vector3()],
      o: new Object3D(),
    }),
    [],
  )

  const straps = useRef<InstancedMesh>(null)

  useFrame(({ clock, camera }, rawDt) => {
    const dt = Math.min(Math.max(rawDt, 0), 0.1)
    const time = clock.elapsedTime
    const t = chapterLocal(journey.progress, 'stables')
    camera.getWorldPosition(sim.cam)
    const near = flightLocal(journey.progress) > 0 || sim.cam.distanceTo(TEAM[0].stall) < 140
    const now = nowSeconds()
    const excitement = Math.exp(-(now - stablesState.bellsAt) * 0.6)
    const ft = flightLocal(journey.progress)
    const sleighS = ft > 0 ? sleighDistance(ft) : 0
    const flying = ft > 0

    TEAM.forEach((spec, i) => {
      const r = rigs[i]
      if (!r.root || !r.body || !r.head) return
      const phase = i * 1.37
      const w = walkProgress(spec, t)
      let gait = 0
      let walking = false
      let galloping = false

      if (flying) {
        // Destination 06: in harness, galloping up the field and into the sky.
        const row = Math.floor(i / 2)
        const s = sleighS + PAIR_OFFSET[3 - row]
        const f = frameAt(s, sim.frame)
        sim.xAxis.copy(f.right).negate()
        sim.basis.makeBasis(sim.xAxis, f.up, f.forward)
        r.root.position.copy(f.pos).addScaledVector(f.right, spec.side * 1.3)
        r.root.quaternion.setFromRotationMatrix(sim.basis)
        r.root.updateMatrixWorld()
        const moving = sleighS > 0.5
        galloping = moving
        walking = moving
        gait = s < 200 ? (s / GALLOP_STRIDE) * Math.PI * 2 : time * 9 + i * 0.4
        sim.collars[i].set(0, 1.27, 0.69).applyMatrix4(r.root.matrixWorld)
      } else if (w <= 0) {
        r.root.position.copy(spec.stall)
        r.root.rotation.set(0, spec.stallYaw, 0)
      } else if (w >= 1) {
        r.root.position.copy(spec.slot)
        r.root.rotation.set(0, Math.PI, 0)
      } else {
        walking = true
        spec.path.getPointAt(w, sim.p)
        spec.path.getTangentAt(w, sim.tan)
        r.root.position.copy(sim.p)
        r.root.rotation.set(0, Math.atan2(sim.tan.x, sim.tan.z), 0)
        gait = ((w * spec.length) / STRIDE) * Math.PI * 2
      }

      // Breathing and body motion.
      const breath = Math.sin(time * 1.15 + phase)
      const bob = galloping ? Math.abs(Math.sin(gait)) * 0.12 : walking ? Math.abs(Math.sin(gait)) * 0.035 : 0
      r.body.position.set(walking ? 0 : Math.sin(time * 0.31 + phase) * 0.02, bob, 0)
      r.body.scale.set(1 + breath * 0.008, 1 + breath * 0.014, 1)
      r.body.rotation.z = walking && !galloping ? Math.sin(gait) * 0.025 : 0
      r.body.rotation.x = galloping ? Math.sin(gait) * 0.07 : 0

      // Head: watch the camera when it is close (in the stall), graze when it is far.
      sim.inv.copy(r.root.matrixWorld).invert()
      sim.local.copy(sim.cam).applyMatrix4(sim.inv)
      const dist = sim.local.length()
      const watching = !walking && dist < 13 && w <= 0
      if (flying) sim.inv.identity()
      let targetYaw = watching ? clamp(Math.atan2(sim.local.x, sim.local.z - 1.0), -0.75, 0.75) : Math.sin(time * 0.21 + phase) * 0.15
      let targetPitch = watching ? clamp(-Math.atan2(sim.local.y - 1.7, Math.max(0.5, sim.local.z)) * 0.5, -0.35, 0.3) : 0
      const grazing = !walking && w <= 0 && !watching && Math.sin(time * 0.12 + phase * 2) > 0.55
      if (grazing) targetPitch = 0.85
      if (walking) {
        targetYaw = 0
        targetPitch = galloping ? -0.28 + Math.sin(gait) * 0.07 : -0.05 + Math.sin(gait * 2) * 0.04
      }
      // Bells rung / greeted: heads come up sharply.
      const greeted = i === 0 ? Math.exp(-(now - stablesState.greetedAt) * 0.8) : 0
      targetPitch -= (excitement + greeted) * 0.35
      const look = sim.look[i]
      look.yaw = damp(look.yaw, targetYaw, 3, dt)
      look.pitch = damp(look.pitch, targetPitch, 2.5, dt)
      r.head.rotation.set(look.pitch + Math.sin(time * 0.5 + phase) * 0.03, look.yaw, 0)

      // Ears twitch, a little more when excited.
      const twitch = Math.pow(Math.max(0, Math.sin(time * 0.8 + phase * 3)), 30) * 0.6
      if (r.earL) r.earL.rotation.set(0, Math.PI, 0.35 + twitch - (excitement + greeted) * 0.3)
      if (r.earR) r.earR.rotation.set(0, 0, -0.35 - twitch * 0.7 + (excitement + greeted) * 0.3)

      // Legs: a four-beat walk (FL, HR, FR, HL), still and square when standing.
      r.legs.forEach((leg, li) => {
        if (!leg.upper || !leg.lower) return
        // Walk: four-beat. Gallop (rotary): hind legs, then fore legs, slightly staggered.
        const offsets = galloping ? [Math.PI, 0.3 * Math.PI, 1.3 * Math.PI, 0] : [0, Math.PI, Math.PI * 1.5, Math.PI * 0.5]
        const ph = gait + offsets[li]
        const front = li === 0 || li === 2
        const amp = galloping ? (front ? 0.75 : 0.7) : front ? 0.42 : 0.38
        const swing = walking ? Math.sin(ph) * amp : Math.sin(time * 0.2 + phase + li) * 0.015
        const bend = walking ? Math.max(0, -Math.sin(ph + 0.7)) * (front ? -1 : 0.9) * (galloping ? 1.15 : 0.8) : 0
        leg.upper.rotation.x = swing
        leg.lower.rotation.x = bend
      })

      // Visible breath: a puff on each exhale, from the nostrils.
      if (near && breath < 0 && look.prevBreath >= 0) {
        r.head.updateWorldMatrix(true, false)
        sim.nose.set(0, -0.02, 0.56).applyMatrix4(r.head.matrixWorld)
        sim.tan.set(0, -0.25, 0.9).transformDirection(r.head.matrixWorld).multiplyScalar(walking ? 0.8 : 0.55)
        const strong = greeted > 0.5 ? 6 : 3
        emitParticles(time, PARTICLE.BREATH, sim.nose.x, sim.nose.y, sim.nose.z, sim.tan.x, sim.tan.y, sim.tan.z, strong, 0.12)
        if (dist < 9 && Math.random() < 0.25) emitStoryEvent('reindeer:snort', { proximity: clamp(1 - dist / 9, 0, 1) })
      }
      look.prevBreath = breath

      // Harness bells jingle with every stride.
      const step = walking ? Math.floor(gait / Math.PI) : look.step
      if (walking && step !== look.step) emitStoryEvent('reindeer:jingle', { proximity: clamp(1 - dist / 30, 0, 1) })
      look.step = step

      if (i === 0 && !flying) {
        r.head.updateWorldMatrix(true, false)
        hotspotAnchors.reindeer.world.set(0, 0.45, 0.2).applyMatrix4(r.head.matrixWorld)
      }
    })

    // Traces (collar to collar back to the sleigh's dash) and Santa's reins, in flight.
    const m = straps.current
    if (m) {
      m.visible = flying
      if (flying) {
        const f = frameAt(sleighS, sim.frame)
        for (const [k, side] of [-1, 1].entries()) {
          sim.dash[k].copy(f.pos).addScaledVector(f.forward, 2.9).addScaledVector(f.up, 1.15).addScaledVector(f.right, side * 1.85)
        }
        let n = 0
        const seg = (a: Vector3, b: Vector3, thick: number) => {
          const o = sim.o
          o.position.copy(a).add(b).multiplyScalar(0.5)
          o.lookAt(b)
          o.scale.set(thick, thick, Math.max(0.01, a.distanceTo(b)))
          o.updateMatrix()
          m.setMatrixAt(n++, o.matrix)
        }
        for (const [k, side] of [-1, 1].entries()) {
          // Team indices on this side, from the rear pair to the lead pair.
          const ids = [6, 4, 2, 0].map((x) => x + (side > 0 ? 1 : 0))
          let prev = sim.dash[k]
          for (const id of ids) {
            seg(prev, sim.collars[id], 0.06)
            prev = sim.collars[id]
          }
        }
        if (santaState.visible) {
          // Santa's hands, from the sleigh's own frame (no frame lag at speed).
          const hand = (z: number, out: Vector3) => out.copy(f.pos).addScaledVector(f.forward, 0.2).addScaledVector(f.up, 1.55).addScaledVector(f.right, z)
          seg(hand(-0.3, sim.xAxis), sim.collars[6], 0.03)
          seg(hand(0.3, sim.xAxis), sim.collars[7], 0.03)
        } else {
          seg(sim.dash[0], sim.dash[0], 0.001)
          seg(sim.dash[1], sim.dash[1], 0.001)
        }
        m.count = n
        m.instanceMatrix.needsUpdate = true
      }
    }
  })

  return (
    <group name="ReindeerTeam">
      <instancedMesh ref={straps} args={[res.strap, res.leather, 10]} frustumCulled={false} visible={false} />
      {TEAM.map((spec, i) => {
        const r = rigs[i]
        const legSpecs = [
          { x: -LEG.x, z: LEG.frontZ, front: true },
          { x: LEG.x, z: LEG.backZ, front: false },
          { x: LEG.x, z: LEG.frontZ, front: true },
          { x: -LEG.x, z: LEG.backZ, front: false },
        ]
        return (
          <group key={spec.name} ref={(g) => void (r.root = g)} name={spec.name}>
            <group ref={(g) => void (r.body = g)}>
              <mesh geometry={res.body} material={res.material} castShadow />
              <mesh geometry={res.collar} material={res.collarMat} />
              <group ref={(g) => void (r.head = g)} position={[0, 1.72, 1.04]}>
                <mesh geometry={res.head} material={res.material} />
                <mesh geometry={res.antlers[i % res.antlers.length]} material={res.material} position={[0, 0.12, 0.08]} />
                <group ref={(g) => void (r.earL = g)} position={[-0.11, 0.14, 0.05]} rotation-y={Math.PI}>
                  <mesh geometry={res.ear} material={res.material} />
                </group>
                <group ref={(g) => void (r.earR = g)} position={[0.11, 0.14, 0.05]}>
                  <mesh geometry={res.ear} material={res.material} />
                </group>
              </group>
              {legSpecs.map((l, li) => (
                <group key={li} ref={(g) => void (r.legs[li].upper = g)} position={[l.x, LEG.hipY, l.z]}>
                  <mesh geometry={l.front ? res.frontUpper : res.backUpper} material={res.material} />
                  <group ref={(g) => void (r.legs[li].lower = g)} position-y={-(l.front ? LEG.frontUpper : LEG.backUpper)}>
                    <mesh geometry={l.front ? res.frontLower : res.backLower} material={res.material} />
                  </group>
                </group>
              ))}
            </group>
          </group>
        )
      })}
    </group>
  )
}
