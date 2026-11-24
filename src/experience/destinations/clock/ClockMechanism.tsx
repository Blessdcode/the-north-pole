import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BackSide, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from 'three'
import { environment } from '../../systems/lighting/environment'
import { buildGearGeometry, createPlankTexture, createStoneTexture } from '../workshop/workshop-assets'
import { clockState, dialMinutes, faceGlow, gearSpeed } from './clock-state'

/**
 * Inside the clock stage (y 60–76): the movement that drives all four dials.
 * Great wheel train, a stepping escapement and anchor, a long pendulum,
 * the winding drum and crank, leading-off rods to each dial — and the backs
 * of the four glass dials with their hands silhouetted against the glow.
 */
const STAGE_Y = 60
const C = new Vector3(0, 68, 0)
const DIAL_BACK_STOPPED = new Color(0.75, 0.6, 0.4)
const DIAL_BACK_AWAKE = new Color(2.6, 2.1, 1.3)

export function ClockMechanism() {
  const root = useRef<Group>(null)
  const gears = useRef<(Mesh | null)[]>([])
  const escape = useRef<Mesh>(null)
  const anchor = useRef<Group>(null)
  const pendulum = useRef<Group>(null)
  const crank = useRef<Group>(null)
  const drum = useRef<Mesh>(null)
  const shafts = useRef<(Mesh | null)[]>([])
  const hands = useRef<{ hour: (Group | null)[]; minute: (Group | null)[] }>({ hour: [], minute: [] })
  const cam = useMemo(() => new Vector3(), [])

  const res = useMemo(() => {
    const stone = createStoneTexture()
    stone.repeat.set(2, 2)
    const planks = createPlankTexture()
    planks.repeat.set(1.5, 1.5)
    return {
      textures: [stone, planks],
      walls: new MeshStandardMaterial({ map: stone, roughness: 0.9, side: BackSide }),
      floor: new MeshStandardMaterial({ map: planks, roughness: 0.8 }),
      iron: new MeshStandardMaterial({ color: '#22252a', roughness: 0.45, metalness: 0.8 }),
      brass: new MeshStandardMaterial({ color: '#d6a650', roughness: 0.26, metalness: 0.95, emissive: new Color('#2a1a05') }),
      timber: new MeshStandardMaterial({ color: '#4a2f1c', roughness: 0.8 }),
      dialBack: new MeshBasicMaterial({ color: DIAL_BACK_STOPPED.clone(), toneMapped: false }),
      handMat: new MeshBasicMaterial({ color: '#0d0805' }),
      lamp: new MeshBasicMaterial({ color: new Color(6, 3.6, 1.6), toneMapped: false }),
      gearGeos: [buildGearGeometry(2.2, 48, 0.22), buildGearGeometry(1.0, 22, 0.22), buildGearGeometry(1.6, 34, 0.2), buildGearGeometry(0.8, 15, 0.14)],
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

  useFrame(({ camera }) => {
    camera.getWorldPosition(cam)
    const dx = cam.x - C.x
    const dz = cam.z - C.z
    const near = Math.hypot(dx, cam.y - C.y, dz) < 34
    if (root.current) root.current.visible = near
    // Deep inside the stage → nothing outside can be seen; skip the open world.
    environment.insideClock = Math.abs(dx) < 6.4 && Math.abs(dz) < 6.4 && cam.y > STAGE_Y + 0.8 && cam.y < STAGE_Y + 15.2
    if (!near) return

    const a = clockState.gearAngle
    const ratios = [1, -2.2, 1.375, 0]
    gears.current.forEach((g, i) => g && (g.rotation.z = a * ratios[i]))
    // Escapement: advances one tooth per beat (every second), the anchor rocks with the pendulum.
    const running = clockState.t >= 0
    const tRun = Math.max(0, clockState.t - 0.3)
    const amp = 0.13 * gearSpeed()
    const swing = running ? Math.sin(tRun * Math.PI) * amp : 0.004
    if (pendulum.current) pendulum.current.rotation.z = swing
    if (anchor.current) anchor.current.rotation.z = swing * 2.2
    if (escape.current) {
      const beat = Math.floor(tRun)
      const frac = tRun - beat
      const step = (Math.PI * 2) / 15 / 2
      escape.current.rotation.z = running && gearSpeed() > 0.05 ? -(beat + Math.min(1, frac * 6)) * step : 0
    }
    if (crank.current) crank.current.rotation.z = clockState.wind * Math.PI * 6 + a * 0.15
    if (drum.current) drum.current.rotation.z = clockState.wind * Math.PI * 2 + a * 0.05
    shafts.current.forEach((s) => s && (s.rotation.y = a * 0.4))
    // Dial backs and hands (seen from behind, so the rotation is mirrored).
    res.dialBack.color.copy(DIAL_BACK_STOPPED).lerp(DIAL_BACK_AWAKE, faceGlow())
    const m = dialMinutes()
    const minuteAngle = (m / 60) * Math.PI * 2
    const hourAngle = ((11 + m / 60) / 12) * Math.PI * 2
    hands.current.minute.forEach((h) => h && (h.rotation.z = minuteAngle))
    hands.current.hour.forEach((h) => h && (h.rotation.z = hourAngle))
  })

  const wall = 7.35
  return (
    <group ref={root} name="ClockMechanism">
      {/* Room */}
      <mesh material={res.walls} position={[0, STAGE_Y + 7.8, 0]}>
        <boxGeometry args={[wall * 2, 15.4, wall * 2]} />
      </mesh>
      <mesh material={res.floor} position={[0, STAGE_Y + 0.32, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[wall * 2, wall * 2]} />
      </mesh>
      {[-4, 0, 4].map((x) => (
        <mesh key={x} material={res.timber} position={[x, STAGE_Y + 15, 0]}>
          <boxGeometry args={[0.6, 0.6, wall * 2]} />
        </mesh>
      ))}
      {/* Backs of the four dials */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r, i) => (
        <group key={r} rotation-y={r}>
          <group position={[0, C.y, wall - 0.02]} rotation-y={Math.PI}>
            <mesh material={res.dialBack}>
              <circleGeometry args={[5.4, 48]} />
            </mesh>
            <group ref={(g) => void (hands.current.hour[i] = g)} position-z={0.05}>
              <mesh material={res.handMat} position-y={1.4}>
                <boxGeometry args={[0.42, 3.0, 0.06]} />
              </mesh>
            </group>
            <group ref={(g) => void (hands.current.minute[i] = g)} position-z={0.09}>
              <mesh material={res.handMat} position-y={2.1}>
                <boxGeometry args={[0.26, 4.4, 0.06]} />
              </mesh>
            </group>
            {/* Leading-off rod down from the ceiling to this dial's motion work */}
            <mesh material={res.iron} position={[0, 3.3, 0.6]}>
              <cylinderGeometry args={[0.09, 0.09, 6.6, 8]} />
            </mesh>
            <mesh material={res.brass} position={[0, 0, 0.35]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.45, 0.45, 0.5, 14]} />
            </mesh>
          </group>
          <mesh ref={(m) => void (shafts.current[i] = m)} material={res.iron} position={[0, STAGE_Y + 14.2, wall / 2]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.1, 0.1, wall, 8]} />
          </mesh>
        </group>
      ))}
      <mesh material={res.brass} position={[0, STAGE_Y + 14.2, 0]}>
        <boxGeometry args={[0.9, 0.9, 0.9]} />
      </mesh>
      <mesh material={res.iron} position={[0, STAGE_Y + 13, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 2.4, 8]} />
      </mesh>
      {/* Movement frame */}
      {[-1.6, 1.6].map((z) => (
        <group key={z}>
          <mesh material={res.iron} position={[0, STAGE_Y + 4.5, z]}>
            <boxGeometry args={[9, 0.4, 0.4]} />
          </mesh>
          <mesh material={res.iron} position={[0, STAGE_Y + 12.2, z]}>
            <boxGeometry args={[6, 0.3, 0.3]} />
          </mesh>
          {[-4, 4].map((x) => (
            <mesh key={x} material={res.iron} position={[x, STAGE_Y + 2.3, z]}>
              <boxGeometry args={[0.35, 4.4, 0.35]} />
            </mesh>
          ))}
          {[-2.8, 2.8].map((x) => (
            <mesh key={`u${x}`} material={res.iron} position={[x, STAGE_Y + 8.4, z]}>
              <boxGeometry args={[0.28, 7.6, 0.28]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Going train */}
      {[
        [-1.5, 6.8, 0],
        [1.65, 6.8, 1],
        [1.65, 9.5, 2],
      ].map(([x, y, g], i) => (
        <mesh key={i} ref={(m) => void (gears.current[i] = m)} geometry={res.gearGeos[g]} material={res.brass} position={[x, STAGE_Y + y, 0]} />
      ))}
      {[
        [-1.5, 6.8],
        [1.65, 6.8],
        [1.65, 9.5],
        [0, 11.0],
      ].map(([x, y], i) => (
        <mesh key={`arbor${i}`} material={res.iron} position={[x, STAGE_Y + y, 0]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.12, 0.12, 3.4, 8]} />
        </mesh>
      ))}
      <mesh ref={escape} geometry={res.gearGeos[3]} material={res.brass} position={[0, STAGE_Y + 11, 0.25]} />
      {/* Anchor rocking over the escape wheel */}
      <group ref={anchor} position={[0, STAGE_Y + 12.1, 0.3]}>
        {[-1, 1].map((s) => (
          <mesh key={s} material={res.iron} position={[s * 0.45, -0.35, 0]} rotation-z={s * 0.7}>
            <boxGeometry args={[0.14, 1.0, 0.14]} />
          </mesh>
        ))}
      </group>
      {/* Pendulum */}
      <group ref={pendulum} position={[0, STAGE_Y + 12.4, -0.7]}>
        <mesh material={res.iron} position-y={-4.7}>
          <boxGeometry args={[0.12, 9.4, 0.12]} />
        </mesh>
        <mesh material={res.brass} position-y={-9.3} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.75, 0.75, 0.22, 28]} />
        </mesh>
      </group>
      {/* Winding drum, weight line and the great crank */}
      <mesh ref={drum} material={res.timber} position={[-3.2, STAGE_Y + 5.6, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.85, 0.85, 1.6, 20]} />
      </mesh>
      <mesh material={res.iron} position={[-4.05, STAGE_Y + 2.8, 0]}>
        <boxGeometry args={[0.05, 5.4, 0.05]} />
      </mesh>
      <group ref={crank} position={[-3.2, STAGE_Y + 5.6, 1.5]}>
        <mesh material={res.brass}>
          <torusGeometry args={[1.05, 0.09, 8, 32]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={res.brass} rotation-z={(i * Math.PI) / 3}>
            <boxGeometry args={[2.1, 0.08, 0.08]} />
          </mesh>
        ))}
        <mesh material={res.timber} position={[0.95, 0, 0.35]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.09, 0.09, 0.7, 8]} />
        </mesh>
      </group>
      {/* Hanging lanterns */}
      {[
        [3.6, 3.6],
        [-3.6, -3.6],
      ].map(([x, z]) => (
        <mesh key={x} material={res.lamp} position={[x, STAGE_Y + 12.8, z]}>
          <sphereGeometry args={[0.32, 12, 8]} />
        </mesh>
      ))}
    </group>
  )
}
