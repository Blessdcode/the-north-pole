import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { journey } from '../../../cinematic/journey'
import { dialMinutes, faceGlow, sinceStrike } from '../clock/clock-state'

/**
 * The Great Christmas Clock — procedural Victorian clock tower (temporary hero
 * stand-in; see ASSETS.md). ~125 m tall so it reads from every corner of the
 * world. Stopped at 11:53 until the visitor winds it in Destination 04; then
 * the hands sweep to midnight, the faces blaze and the beacon flares with
 * every strike of the bell. All of it is driven by clock-state.
 */
const DIAL_STOPPED = new Color(1.05, 0.86, 0.58)
const DIAL_AWAKE = new Color(3.4, 2.75, 1.7)

interface Hands {
  hour: (Group | null)[]
  minute: (Group | null)[]
}

function ClockFace({ rotationY, index, hands, dial }: { rotationY: number; index: number; hands: Hands; dial: MeshBasicMaterial }) {
  return (
    <group rotation-y={rotationY}>
      <group position={[0, 68, 7.62]}>
        {/* Bezel */}
        <mesh>
          <torusGeometry args={[5.7, 0.38, 10, 48]} />
          <meshStandardMaterial color="#b08a45" metalness={0.85} roughness={0.35} />
        </mesh>
        {/* Translucent dial, lit from within (in front of the stage wall) */}
        <mesh position-z={0.03} name="ClockDial" material={dial}>
          <circleGeometry args={[5.5, 48]} />
        </mesh>
        {/* Hour marks */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.sin(a) * 4.7, Math.cos(a) * 4.7, 0.09]} rotation-z={-a}>
              <boxGeometry args={[0.28, i % 3 === 0 ? 1.1 : 0.6, 0.08]} />
              <meshBasicMaterial color="#1b120a" />
            </mesh>
          )
        })}
        {/* Hands */}
        <group ref={(g) => void (hands.hour[index] = g)} position-z={0.15}>
          <mesh position-y={1.4}>
            <boxGeometry args={[0.42, 3.0, 0.08]} />
            <meshBasicMaterial color="#120b06" />
          </mesh>
        </group>
        <group ref={(g) => void (hands.minute[index] = g)} position-z={0.21}>
          <mesh position-y={2.1}>
            <boxGeometry args={[0.26, 4.4, 0.08]} />
            <meshBasicMaterial color="#120b06" />
          </mesh>
        </group>
        <mesh position-z={0.27}>
          <cylinderGeometry args={[0.35, 0.35, 0.1, 16]} />
          <meshStandardMaterial color="#b08a45" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

export function ClockTower({ shadows }: { shadows: boolean }) {
  const group = useRef<Group>(null)
  const beacon = useRef<Mesh>(null)
  const hands = useMemo<Hands>(() => ({ hour: [], minute: [] }), [])

  const mats = useMemo(
    () => ({
      brick: new MeshStandardMaterial({ color: '#4a2219', roughness: 0.9 }),
      stone: new MeshStandardMaterial({ color: '#8d8476', roughness: 0.85 }),
      slate: new MeshStandardMaterial({ color: '#1b2233', roughness: 0.55, metalness: 0.2 }),
      snow: new MeshStandardMaterial({ color: '#e3ebfb', roughness: 0.95 }),
      gold: new MeshStandardMaterial({ color: '#c99a4b', metalness: 0.9, roughness: 0.3 }),
      window: new MeshBasicMaterial({ color: new Color(2.6, 1.55, 0.7), toneMapped: false }),
      beacon: new MeshBasicMaterial({ color: new Color(6, 3.2, 1.2), toneMapped: false }),
      dial: new MeshBasicMaterial({ color: DIAL_STOPPED.clone(), toneMapped: false }),
    }),
    [],
  )
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats])

  useFrame(({ clock }) => {
    // Hands: minutes past eleven.
    const m = dialMinutes()
    const minuteAngle = -(m / 60) * Math.PI * 2
    const hourAngle = -((11 + m / 60) / 12) * Math.PI * 2
    hands.minute.forEach((h) => h && (h.rotation.z = minuteAngle))
    hands.hour.forEach((h) => h && (h.rotation.z = hourAngle))
    mats.dial.color.copy(DIAL_STOPPED).lerp(DIAL_AWAKE, faceGlow())
    // The spire beacon breathes slowly, and flares with every strike of the bell.
    const b = beacon.current
    if (b) {
      const flare = Math.exp(-sinceStrike() * 2.2)
      const s = 1 + Math.sin(clock.elapsedTime * 1.3) * 0.12 + journey.pulse * 0.6 + flare * 2.5
      b.scale.setScalar(s)
    }
  })

  const corners: [number, number][] = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]

  return (
    <group ref={group} name="GreatChristmasClock">
      {/* Plinth with snow */}
      <mesh material={mats.stone} position-y={2} castShadow={shadows} receiveShadow>
        <boxGeometry args={[24, 4, 24]} />
      </mesh>
      <mesh material={mats.snow} position-y={4.1}>
        <boxGeometry args={[24.4, 0.25, 24.4]} />
      </mesh>
      {/* Lower hall */}
      <mesh material={mats.brick} position-y={17} castShadow={shadows} receiveShadow>
        <boxGeometry args={[17, 26, 17]} />
      </mesh>
      {corners.map(([x, z], i) => (
        <mesh key={i} material={mats.stone} position={[x * 8.6, 17, z * 8.6]} castShadow={shadows}>
          <boxGeometry args={[2.4, 26.5, 2.4]} />
        </mesh>
      ))}
      {/* Tall arched windows on the hall */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r, i) => (
        <group key={i} rotation-y={r}>
          {[-4, 0, 4].map((x) => (
            <mesh key={x} material={mats.window} position={[x, 15, 8.53]}>
              <planeGeometry args={[1.8, 7]} />
            </mesh>
          ))}
          <mesh material={mats.window} position={[0, 6.2, 8.53]}>
            <planeGeometry args={[3.2, 4.2]} />
          </mesh>
        </group>
      ))}
      {/* Cornice + snow ledge */}
      <mesh material={mats.stone} position-y={30.5}>
        <boxGeometry args={[19, 1.4, 19]} />
      </mesh>
      <mesh material={mats.snow} position-y={31.3}>
        <boxGeometry args={[19.2, 0.3, 19.2]} />
      </mesh>
      {/* Shaft */}
      <mesh material={mats.brick} position-y={45.5} castShadow={shadows}>
        <boxGeometry args={[12.5, 29, 12.5]} />
      </mesh>
      {corners.map(([x, z], i) => (
        <mesh key={`s${i}`} material={mats.stone} position={[x * 6.2, 45.5, z * 6.2]}>
          <boxGeometry args={[1.6, 29, 1.6]} />
        </mesh>
      ))}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r, i) => (
        <group key={`sw${i}`} rotation-y={r}>
          <mesh material={mats.window} position={[0, 46, 6.28]}>
            <planeGeometry args={[1.4, 5]} />
          </mesh>
        </group>
      ))}
      {/* Clock stage */}
      <mesh material={mats.stone} position-y={68} castShadow={shadows}>
        <boxGeometry args={[15.2, 16, 15.2]} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r, i) => (
        <ClockFace key={r} rotationY={r} index={i} hands={hands} dial={mats.dial} />
      ))}
      <mesh material={mats.slate} position-y={76.8}>
        <boxGeometry args={[17.5, 1.6, 17.5]} />
      </mesh>
      <mesh material={mats.snow} position-y={77.75}>
        <boxGeometry args={[17.6, 0.3, 17.6]} />
      </mesh>
      {/* Corner pinnacles */}
      {corners.map(([x, z], i) => (
        <mesh key={`p${i}`} material={mats.slate} position={[x * 8, 82, z * 8]} castShadow={shadows}>
          <coneGeometry args={[1.1, 8, 4]} />
        </mesh>
      ))}
      {/* Open belfry */}
      {corners.map(([x, z], i) => (
        <mesh key={`b${i}`} material={mats.stone} position={[x * 4.6, 83, z * 4.6]}>
          <boxGeometry args={[1.3, 10, 1.3]} />
        </mesh>
      ))}
      <mesh material={mats.gold} position-y={82.5}>
        <cylinderGeometry args={[0.8, 2.6, 4.2, 20, 1, true]} />
      </mesh>
      <mesh material={mats.slate} position-y={88.6}>
        <boxGeometry args={[11.5, 1.2, 11.5]} />
      </mesh>
      {/* Spire */}
      <mesh material={mats.slate} position-y={106} rotation-y={Math.PI / 4} castShadow={shadows}>
        <coneGeometry args={[8.1, 34, 4]} />
      </mesh>
      <mesh material={mats.gold} position-y={124}>
        <cylinderGeometry args={[0.15, 0.25, 4, 8]} />
      </mesh>
      {/* Beacon star */}
      <mesh ref={beacon} material={mats.beacon} position-y={127}>
        <octahedronGeometry args={[1.3, 0]} />
      </mesh>
    </group>
  )
}
