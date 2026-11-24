import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide, Group, MeshStandardMaterial, Vector3 } from 'three'
import { journey } from '../../../cinematic/journey'
import { chapterLocal } from '../../../config/destinations'
import { hotspotAnchors } from '../../../interaction/hotspots/hotspot-anchors'
import { Cableway } from './Cableway'
import { FactoryFloor } from './FactoryFloor'
import { HeroGift } from './HeroGift'
import { BELT, GALLERY, HALL, LIFT, WRAP_X } from './workshop-layout'
import { WorkshopHall } from './WorkshopHall'

/** Helical ramp of the spiral lift, with a central column. */
function SpiralLift() {
  const res = useMemo(() => {
    const steps = 220
    const inner = LIFT.radius - 1.1
    const outer = LIFT.radius + 1.1
    const y0 = BELT.top - 0.05
    const y1 = GALLERY.y + 0.95
    const pos: number[] = []
    const idx: number[] = []
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const a = Math.PI + LIFT.turns * Math.PI * 2 * u
      const y = y0 + (y1 - y0) * u
      for (const r of [inner, outer]) pos.push(LIFT.x + Math.cos(a) * r, y, LIFT.z - Math.sin(a) * r)
      if (i > 0) {
        const k = i * 2
        idx.push(k - 2, k - 1, k, k - 1, k + 1, k)
      }
    }
    const ramp = new BufferGeometry()
    ramp.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    ramp.setIndex(idx)
    ramp.computeVertexNormals()
    return {
      ramp,
      rampMat: new MeshStandardMaterial({ color: '#23262b', roughness: 0.5, metalness: 0.7, side: DoubleSide }),
      columnMat: new MeshStandardMaterial({ color: '#8a0c12', roughness: 0.4, metalness: 0.4 }),
      brass: new MeshStandardMaterial({ color: '#d2a24f', roughness: 0.3, metalness: 0.9 }),
    }
  }, [])
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res])
  const h = GALLERY.y + 4 - HALL.floor
  return (
    <group name="SpiralLift">
      <mesh geometry={res.ramp} material={res.rampMat} />
      <mesh material={res.columnMat} position={[LIFT.x, HALL.floor + h / 2, LIFT.z]}>
        <cylinderGeometry args={[1.4, 1.8, h, 20]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} material={res.brass} position={[LIFT.x, HALL.floor + 3 + i * 6, LIFT.z]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.55, 0.12, 8, 24]} />
        </mesh>
      ))}
      {/* Bridge from the top of the spiral into the gallery */}
      <mesh material={res.rampMat} position={[(LIFT.x + LIFT.radius + HALL.east) / 2 + 1, GALLERY.y - 0.2, GALLERY.z]}>
        <boxGeometry args={[HALL.east - LIFT.x - LIFT.radius + 4, 0.4, 2.4]} />
      </mesh>
    </group>
  )
}

/**
 * Destination 03 — The Great Workshop.
 * The hall interior is streamed: it renders only from the end of the Express
 * tunnel until the camera has left through the great door. The Gift Line
 * outside is part of the open world and always present.
 */
export function Workshop() {
  const interior = useRef<Group>(null)
  const camPos = useMemo(() => new Vector3(), [])

  useEffect(() => {
    hotspotAnchors.machine.world.set(WRAP_X, BELT.top + 5.9, BELT.lines[1])
  }, [])

  useFrame(({ camera }) => {
    const p = journey.progress
    camera.getWorldPosition(camPos)
    const near = camPos.x < -330 && camPos.x > -760 && camPos.z < -80 && camPos.z > -230
    // From the end of the Express tunnel until the camera has left the mountain.
    if (interior.current) interior.current.visible = chapterLocal(p, 'express') > 0.85 && chapterLocal(p, 'workshop') < 0.8 && near
  })

  return (
    <group name="GreatWorkshop">
      <group ref={interior}>
        <WorkshopHall />
        <FactoryFloor />
        <SpiralLift />
      </group>
      <HeroGift />
      <Cableway />
    </group>
  )
}
