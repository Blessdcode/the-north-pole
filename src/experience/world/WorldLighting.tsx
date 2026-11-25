import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { DirectionalLight, HemisphereLight, Object3D } from 'three'
import { Color } from 'three'
import { journey } from '../../cinematic/journey'
import { environment } from '../systems/lighting/environment'
import { timeOfDay } from '../systems/lighting/time-of-day'
import { MOON_DIRECTION, PALETTE } from './palette'

const WARM_SKY = new Color('#ffb877')
const WARM_GROUND = new Color('#3a1e0c')

/**
 * Cold global light: moonlight + sky fill.
 * Warm light is local to the village (see destinations/village/VillageLights).
 * One shadow-casting light, focused on the village bowl only, on high quality.
 */
export function WorldLighting({ shadows }: { shadows: boolean }) {
  const moon = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const gl = useThree((s) => s.gl)
  const shadowFrames = useRef(0)

  // The moon and the village never move, so the shadow map is rendered only
  // during the first frames (after all instances are placed), then frozen.
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    shadowFrames.current = 0
    return () => {
      gl.shadowMap.autoUpdate = true
    }
  }, [gl, shadows])

  useEffect(() => {
    const light = moon.current
    if (!light) return
    const target = new Object3D()
    target.position.set(0, 0, 0)
    light.target = target
    light.parent?.add(target)
    const cam = light.shadow.camera
    cam.left = -280
    cam.right = 280
    cam.top = 280
    cam.bottom = -280
    cam.near = 100
    cam.far = 2600
    cam.updateProjectionMatrix()
    light.shadow.bias = -0.0004
    light.shadow.normalBias = 0.6
    return () => {
      target.removeFromParent()
    }
  }, [])

  useFrame(() => {
    if (shadows && shadowFrames.current < 30) {
      shadowFrames.current++
      gl.shadowMap.needsUpdate = true
    }
    // Lights rise with the opening reveal so the world emerges from darkness.
    // Inside the Workshop the moon is gone and the fill turns lantern-warm.
    const r = journey.reveal
    const inside = environment.interior
    const dawn = timeOfDay.dawn
    if (moon.current) {
      moon.current.intensity = (1.55 * (1 - dawn) + 2.8 * dawn) * r * (1 - inside)
      moon.current.color.copy(PALETTE.moonlight)
      moon.current.position.copy(timeOfDay.keyDirection).multiplyScalar(1400)
    }
    // The light swings toward the rising sun: keep the (static) shadow map in step.
    if (shadows && dawn > 0.001 && dawn < 0.999) gl.shadowMap.needsUpdate = true
    if (hemi.current) {
      hemi.current.intensity = (0.7 * r + 0.02) * (1 - inside) + 0.55 * inside
      hemi.current.color.copy(PALETTE.hemiSky).lerp(WARM_SKY, inside)
      hemi.current.groundColor.copy(PALETTE.hemiGround).lerp(WARM_GROUND, inside)
    }
  })

  const p = MOON_DIRECTION.clone().multiplyScalar(1400)
  return (
    <>
      <hemisphereLight ref={hemi} args={[PALETTE.hemiSky, PALETTE.hemiGround, 0.7]} />
      <directionalLight
        ref={moon}
        color={PALETTE.moonlight}
        position={[p.x, p.y, p.z]}
        intensity={1.55}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
      />
    </>
  )
}
