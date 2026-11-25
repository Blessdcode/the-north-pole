import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Group, MathUtils, Matrix4, PerspectiveCamera as ThreePerspectiveCamera, Quaternion, Vector3 } from 'three'
import { createShot, directShot } from '../../cinematic/camera-paths/director'
import { cameraState } from '../../cinematic/camera-state'
import { journey } from '../../cinematic/journey'
import { beatIndexAt, STORY_BEATS } from '../../config/destinations'
import { pointer } from '../../interaction/pointer-controller'
import { damp } from '../../lib/math'
import { useExperience } from '../../store/experience-store'
import { heightAt } from '../world/geography'

const MAX_YAW = 0.38
const MAX_PITCH = 0.16

/**
 * CameraPathController     ← position from the director's authored shot
 * └── CinematicRig         ← orientation: look-at target + bank roll
 *     └── ExplorationPivot ← bounded pointer/touch look-around
 *         └── PerspectiveCamera
 *
 * Journey progress is advanced by <StoryClock/> before this runs.
 */
export function CameraRig() {
  const pathController = useRef<Group>(null)
  const cinematicRig = useRef<Group>(null)
  const explorationPivot = useRef<Group>(null)
  const camera = useRef<ThreePerspectiveCamera>(null)
  const reducedMotion = useExperience((s) => s.reducedMotion)

  const scratch = useMemo(
    () => ({
      shot: createShot(),
      up: new Vector3(0, 1, 0),
      m: new Matrix4(),
      q: new Quaternion(),
      roll: new Quaternion(),
      fwd: new Vector3(0, 0, -1),
      yaw: 0,
      pitch: 0,
    }),
    [],
  )

  useFrame((state, rawDt) => {
    const dt = Math.min(Math.max(rawDt, 0), 1 / 20)
    const ctl = pathController.current
    const rig = cinematicRig.current
    const pivot = explorationPivot.current
    const cam = camera.current
    if (!ctl || !rig || !pivot || !cam) return

    const p = journey.progress
    const shot = directShot(p, scratch.shot)
    const pos = shot.pos

    // Terrain safety: never let a shot clip into the ground or a mountainside.
    const ground = heightAt(pos.x, pos.z) + shot.clearance
    if (pos.y < ground) pos.y = ground

    // Subtle drone/handheld breathing, scaled down near the ground.
    const t = state.clock.elapsedTime
    if (!reducedMotion) {
      const amp = MathUtils.clamp(pos.y / 60, 0.12, 1)
      pos.x += (Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.73) * 0.25) * amp
      pos.y += Math.sin(t * 0.47) * 0.45 * amp
    }
    ctl.position.copy(pos)
    cameraState.position.copy(pos)

    scratch.m.lookAt(pos, shot.look, scratch.up)
    scratch.q.setFromRotationMatrix(scratch.m)
    scratch.roll.setFromAxisAngle(scratch.fwd, reducedMotion ? 0 : shot.roll)
    scratch.q.multiply(scratch.roll)
    rig.quaternion.copy(scratch.q)

    // Exploration: bounded, beat-authored influence, returns home gently.
    const influence = pointer.enabled ? STORY_BEATS[beatIndexAt(p)].pointerInfluence : 0
    const motionScale = reducedMotion ? 0.45 : 1
    scratch.yaw = damp(scratch.yaw, -pointer.x * MAX_YAW * influence * motionScale, 2.2, dt)
    scratch.pitch = damp(scratch.pitch, -pointer.y * MAX_PITCH * influence * motionScale, 2.2, dt)
    pivot.rotation.set(scratch.pitch, scratch.yaw, 0, 'YXZ')

    // Lens: authored FOV, widened by travel speed and for portrait screens.
    const speedKick = reducedMotion ? 0 : MathUtils.clamp(Math.abs(journey.velocity) * 60, 0, 5)
    const portrait = cam.aspect < 0.8 ? 16 : cam.aspect < 1.2 ? 7 : 0
    const fov = shot.fov + speedKick + portrait
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = damp(cam.fov, fov, 4, dt)
      cam.updateProjectionMatrix()
    }
  })

  return (
    <group ref={pathController} name="CameraPathController">
      <group ref={cinematicRig} name="CinematicRig">
        <group ref={explorationPivot} name="ExplorationPivot">
          <PerspectiveCamera ref={camera} makeDefault fov={42} near={0.3} far={12000} />
        </group>
      </group>
    </group>
  )
}
