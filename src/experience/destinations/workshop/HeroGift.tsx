import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Group, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { journey } from '../../../cinematic/journey'
import { chapterLocal } from '../../../config/destinations'
import { hotspotAnchors } from '../../../interaction/hotspots/hotspot-anchors'
import { createPaperTexture } from './workshop-assets'
import { buildRibbonGeometry } from './workshop-assets'
import { heroGiftDistance, heroGiftWrapped, ROUTE_MARKS, routePointAt, routeTangentAt } from './workshop-layout'

/**
 * The one gift the story follows. Plain brown paper until it passes through
 * the wrapping machine, then gold with a crimson bow. Its tag (a hotspot)
 * reads: "For the Great Clock — to be opened at midnight."
 */
const SIZE = 1.25

export function HeroGift() {
  const group = useRef<Group>(null)
  const body = useRef<Mesh>(null)
  const ribbon = useRef<Mesh>(null)
  const gondola = useRef<Group>(null)

  const res = useMemo(() => {
    const gold = createPaperTexture('#d6a63c', '#8a0c12')
    return {
      gold,
      ribbonGeo: buildRibbonGeometry(),
      kraft: new MeshStandardMaterial({ color: '#9a6a3c', roughness: 0.8 }),
      wrapped: new MeshStandardMaterial({ map: gold, roughness: 0.4, metalness: 0.25, emissive: new Color('#3a2408') }),
      ribbonMat: new MeshStandardMaterial({ color: '#b3121b', roughness: 0.3, metalness: 0.3 }),
      tagMat: new MeshStandardMaterial({ color: '#f3e7cc', roughness: 0.7 }),
      iron: new MeshStandardMaterial({ color: '#1d1f22', roughness: 0.5, metalness: 0.7 }),
      basket: new MeshStandardMaterial({ color: '#8a0c12', roughness: 0.4, metalness: 0.4 }),
    }
  }, [])
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res])

  const tmp = useMemo(
    () => ({ p: new Vector3(), tan: new Vector3(), q: new Quaternion(), m: new Matrix4(), up: new Vector3(0, 1, 0), flat: new Vector3() }),
    [],
  )

  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const t = chapterLocal(journey.progress, 'workshop')
    const d = heroGiftDistance(t)
    routePointAt(d, tmp.p)
    routeTangentAt(d, tmp.tan)
    g.position.copy(tmp.p)
    // Face along the route on the ground plane (gifts don't pitch up the spiral).
    tmp.flat.set(tmp.tan.x, 0, tmp.tan.z)
    if (tmp.flat.lengthSq() > 1e-6) g.rotation.y = Math.atan2(tmp.flat.x, tmp.flat.z)
    const onCable = d >= ROUTE_MARKS.cableStart - 1
    // A little life: a bob while waiting, a sway on the cable.
    const time = clock.elapsedTime
    g.rotation.z = onCable ? Math.sin(time * 1.3) * 0.04 : 0
    if (gondola.current) gondola.current.visible = onCable
    const wrapped = heroGiftWrapped(d)
    if (body.current) body.current.material = wrapped ? res.wrapped : res.kraft
    if (ribbon.current) ribbon.current.visible = wrapped
    const a = hotspotAnchors.gift
    a.world.copy(tmp.p).y += SIZE * 0.9
    // Present from the factory floor onward (and waiting at the terminal afterwards).
    g.visible = chapterLocal(journey.progress, 'express') > 0.9
  })

  return (
    <group ref={group} name="HeroGift">
      <mesh ref={body} material={res.kraft} position-y={0}>
        <boxGeometry args={[SIZE, SIZE * 0.85, SIZE]} />
      </mesh>
      <mesh ref={ribbon} geometry={res.ribbonGeo} material={res.ribbonMat} scale={[SIZE, SIZE * 0.85, SIZE]} />
      {/* Tag on a string */}
      <mesh material={res.tagMat} position={[SIZE * 0.52, 0.1, SIZE * 0.2]} rotation={[0, Math.PI / 2, 0.25]}>
        <planeGeometry args={[0.36, 0.22]} />
      </mesh>
      {/* Gondola carrier (only on the Gift Line) */}
      <group ref={gondola} visible={false}>
        <mesh material={res.basket} position-y={-0.55}>
          <boxGeometry args={[1.9, 0.3, 1.9]} />
        </mesh>
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} material={res.iron} position={[x, 1.0, 0]}>
            <boxGeometry args={[0.06, 3.1, 0.06]} />
          </mesh>
        ))}
        <mesh material={res.iron} position-y={2.55}>
          <boxGeometry args={[1.9, 0.08, 0.08]} />
        </mesh>
        <mesh material={res.iron} position-y={2.6}>
          <cylinderGeometry args={[0.18, 0.18, 0.3, 10]} />
        </mesh>
      </group>
    </group>
  )
}
