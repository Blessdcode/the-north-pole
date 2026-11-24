import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Path,
  PlaneGeometry,
  Shape,
  TorusGeometry,
  Vector3,
} from 'three'
import { journey } from '../../../cinematic/journey'
import { chapterLocal } from '../../../config/destinations'
import { smoothstep } from '../../../lib/math'
import { heightAt } from '../../world/geography'
import { RAIL_TOP, railDirectionAt, railPointAt, railSAt } from '../../world/railway-path'
import { createGlowTexture } from '../village/village-assets'
import { createPlankTexture, createSignTexture, createStoneTexture } from './workshop-assets'
import { GALLERY, HALL, heroGiftDistance, MOUTH_X, ROUTE_MARKS } from './workshop-layout'

const F = HALL.floor
const W = HALL.east - HALL.west // 180
const D = HALL.north - HALL.south // 100
const WALL_H = 24
const VAULT_SCALE = (HALL.height - WALL_H) / (D / 2)
const CX = (HALL.west + HALL.east) / 2
const CZ = (HALL.north + HALL.south) / 2

function setInstances(mesh: InstancedMesh | null, matrices: Matrix4[], colors?: Color[]) {
  if (!mesh) return
  matrices.forEach((m, i) => {
    mesh.setMatrixAt(i, m)
    if (colors) mesh.setColorAt(i, colors[i])
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}

/** East wall with an arched railway mouth and the square gallery opening. */
function buildEastWall(railZ: number) {
  const s = new Shape()
  s.moveTo(HALL.south, F)
  s.lineTo(HALL.north, F)
  s.lineTo(HALL.north, F + HALL.height + 2)
  s.lineTo(HALL.south, F + HALL.height + 2)
  s.closePath()
  const rail = new Path()
  rail.moveTo(railZ - 4.6, F)
  rail.lineTo(railZ + 4.6, F)
  rail.lineTo(railZ + 4.6, F + 6.5)
  rail.absarc(railZ, F + 6.5, 4.6, 0, Math.PI, false)
  rail.lineTo(railZ - 4.6, F)
  s.holes.push(rail)
  const g = new Path()
  const gz = GALLERY.z
  const gy = GALLERY.y
  g.moveTo(gz - GALLERY.width / 2, gy)
  g.lineTo(gz + GALLERY.width / 2, gy)
  g.lineTo(gz + GALLERY.width / 2, gy + GALLERY.height - 2)
  g.absarc(gz, gy + GALLERY.height - 2, GALLERY.width / 2, 0, Math.PI, false)
  g.lineTo(gz - GALLERY.width / 2, gy)
  s.holes.push(g)
  const geo = new ExtrudeGeometry(s, { depth: 3, bevelEnabled: false })
  // Shape lies in (z, y); extrude along +x from the wall plane.
  geo.rotateY(-Math.PI / 2) // shape u → z, extrusion → -x (wall spans east-3 … east)
  geo.translate(HALL.east, 0, 0)
  geo.computeVertexNormals()
  return geo
}

/** The round "Present Port" door that swings open onto the mountain face. */
function buildDoorGeometry(r: number) {
  const s = new Shape()
  s.absarc(0, 0, r, 0, Math.PI * 2, false)
  return new ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, curveSegments: 40 })
}

export function WorkshopHall() {
  const root = useRef<Group>(null)
  const ribs = useRef<InstancedMesh>(null)
  const lamps = useRef<InstancedMesh>(null)
  const chains = useRef<InstancedMesh>(null)
  const pools = useRef<InstancedMesh>(null)
  const rails = useRef<InstancedMesh>(null)
  const sleepers = useRef<InstancedMesh>(null)
  const galleryLamps = useRef<InstancedMesh>(null)
  const door = useRef<Group>(null)
  const bullwheel = useRef<Group>(null)

  const railZ = useMemo(() => railPointAt(railSAt(HALL.east, -137)).z, [])

  const res = useMemo(() => {
    const planks = createPlankTexture()
    planks.repeat.set(W / 12, D / 12)
    const stone = createStoneTexture()
    stone.repeat.set(W / 16, WALL_H / 8)
    const stoneShort = createStoneTexture()
    stoneShort.repeat.set(D / 16, WALL_H / 8)
    const sign = createSignTexture(['THE GREAT WORKSHOP', 'NORTH POLE WORKS  ·  EVERY GIFT BY HAND SINCE THE FIRST CHRISTMAS'])
    const glow = createGlowTexture()
    const vault = new CylinderGeometry(D / 2, D / 2, W, 48, 1, true, 0, Math.PI)
    vault.rotateZ(Math.PI / 2)
    return {
      textures: [planks, stone, stoneShort, sign, glow],
      floorMat: new MeshStandardMaterial({ map: planks, roughness: 0.82 }),
      wallMat: new MeshStandardMaterial({ map: stone, roughness: 0.9 }),
      wallShortMat: new MeshStandardMaterial({ map: stoneShort, roughness: 0.9 }),
      vaultMat: new MeshStandardMaterial({ color: '#3b2a1e', roughness: 0.85, side: BackSide }),
      timber: new MeshStandardMaterial({ color: '#4a2f1c', roughness: 0.75 }),
      iron: new MeshStandardMaterial({ color: '#1d1f22', roughness: 0.5, metalness: 0.7 }),
      brass: new MeshStandardMaterial({ color: '#d2a24f', roughness: 0.3, metalness: 0.9 }),
      steel: new MeshStandardMaterial({ color: '#8f97a6', metalness: 0.9, roughness: 0.3 }),
      sleeperMat: new MeshStandardMaterial({ color: '#2a1c14', roughness: 0.95 }),
      platformMat: new MeshStandardMaterial({ color: '#6e6a66', roughness: 0.9 }),
      doorMat: new MeshStandardMaterial({ color: '#5a2614', roughness: 0.7 }),
      snow: new MeshStandardMaterial({ color: '#e6edfb', roughness: 1 }),
      signMat: new MeshBasicMaterial({ map: sign }),
      lampMat: new MeshBasicMaterial({ color: new Color(6, 3.6, 1.6), toneMapped: false }),
      poolMat: new MeshBasicMaterial({
        map: glow,
        color: new Color('#ff9a48').multiplyScalar(0.5),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        toneMapped: false,
      }),
      vault,
      eastWall: buildEastWall(railZ),
      door: buildDoorGeometry(GALLERY.width / 2 + 0.6),
      rib: new TorusGeometry(D / 2 - 0.6, 0.7, 6, 48, Math.PI),
      lampGeo: new IcosahedronGeometry(0.55, 1),
      chainGeo: new CylinderGeometry(0.05, 0.05, 1, 4),
      poolGeo: new PlaneGeometry(1, 1),
      railGeo: new BoxGeometry(0.16, 0.2, 1),
      sleeperGeo: new BoxGeometry(2.6, 0.18, 0.32),
    }
  }, [railZ])

  useEffect(
    () => () => {
      Object.values(res).forEach((v) => {
        if (Array.isArray(v)) v.forEach((t) => t.dispose())
        else v.dispose()
      })
    },
    [res],
  )

  const layout = useMemo(() => {
    const o = new Object3D()
    const ribM: Matrix4[] = []
    for (let x = HALL.west + 7.5; x < HALL.east; x += 15) {
      o.position.set(x, F + WALL_H, CZ)
      o.rotation.set(0, Math.PI / 2, 0)
      o.scale.set(1, VAULT_SCALE, 1)
      o.updateMatrix()
      ribM.push(o.matrix.clone())
    }
    const lampM: Matrix4[] = []
    const chainM: Matrix4[] = []
    const poolM: Matrix4[] = []
    for (let x = HALL.west + 14; x < HALL.east - 6; x += 16) {
      for (const z of [-114, -152, -176, -194]) {
        const y = F + 17 + ((x * 7 + z) % 3)
        o.position.set(x, y, z)
        o.rotation.set(0, 0, 0)
        o.scale.setScalar(1)
        o.updateMatrix()
        lampM.push(o.matrix.clone())
        const top = F + WALL_H + VAULT_SCALE * Math.sqrt(Math.max(0, (D / 2) ** 2 - (z - CZ) ** 2)) - 0.5
        o.position.set(x, (y + top) / 2, z)
        o.scale.set(1, top - y, 1)
        o.updateMatrix()
        chainM.push(o.matrix.clone())
        o.position.set(x, F + 0.03, z)
        o.rotation.set(-Math.PI / 2, 0, 0)
        o.scale.set(16, 16, 1)
        o.updateMatrix()
        poolM.push(o.matrix.clone())
      }
    }
    // Interior track from the east wall to the buffer stops.
    const railM: Matrix4[] = []
    const sleeperM: Matrix4[] = []
    const p = new Vector3()
    const d = new Vector3()
    const s0 = railSAt(HALL.east + 2, -137)
    const s1 = railSAt(HALL.west + 10, -134)
    for (let s = s0; s < s1; s += 4) {
      railPointAt(s + 2, p)
      railDirectionAt(s + 2, d)
      for (const side of [-1, 1]) {
        o.position.set(p.x + d.z * side * 0.75, p.y - RAIL_TOP + 0.42, p.z - d.x * side * 0.75)
        o.rotation.set(0, Math.atan2(d.x, d.z), 0)
        o.scale.set(1, 1, 4.08)
        o.updateMatrix()
        railM.push(o.matrix.clone())
      }
    }
    for (let s = s0; s < s1; s += 1.4) {
      railPointAt(s, p)
      railDirectionAt(s, d)
      o.position.set(p.x, p.y - RAIL_TOP + 0.22, p.z)
      o.rotation.set(0, Math.atan2(d.x, d.z), 0)
      o.scale.set(1, 1, 1)
      o.updateMatrix()
      sleeperM.push(o.matrix.clone())
    }
    // Gallery lanterns.
    const gl: Matrix4[] = []
    for (let x = HALL.east + 4; x < MOUTH_X - 2; x += 9) {
      for (const side of [-1, 1]) {
        o.position.set(x, GALLERY.y + 4.6, GALLERY.z + side * (GALLERY.width / 2 - 0.5))
        o.rotation.set(0, 0, 0)
        o.scale.setScalar(0.45)
        o.updateMatrix()
        gl.push(o.matrix.clone())
      }
    }
    return { ribM, lampM, chainM, poolM, railM, sleeperM, gl, bufferX: railPointAt(s1) }
  }, [])

  useLayoutEffect(() => {
    setInstances(ribs.current, layout.ribM)
    setInstances(lamps.current, layout.lampM)
    setInstances(chains.current, layout.chainM)
    setInstances(pools.current, layout.poolM)
    setInstances(rails.current, layout.railM)
    setInstances(sleepers.current, layout.sleeperM)
    setInstances(galleryLamps.current, layout.gl)
  }, [layout])

  // The great door swings open as the hero gift approaches; the bullwheel turns.
  useFrame((_, dt) => {
    const t = chapterLocal(journey.progress, 'workshop')
    const d = heroGiftDistance(t)
    const open = smoothstep(ROUTE_MARKS.mouth - 40, ROUTE_MARKS.mouth - 8, d)
    if (door.current) door.current.rotation.y = -open * 1.75
    if (bullwheel.current) bullwheel.current.rotation.y += dt * 0.35
  })

  const galleryLen = MOUTH_X - HALL.east
  const gx = (HALL.east + MOUTH_X) / 2
  const balconyY = GALLERY.y
  const balconyX = MOUTH_X + 15
  const posts = [MOUTH_X + 6, MOUTH_X + 16, MOUTH_X + 26]

  return (
    <group ref={root} name="WorkshopHall">
      {/* Floor */}
      <mesh material={res.floorMat} position={[CX, F, CZ]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* Long walls */}
      <mesh material={res.wallMat} position={[CX, F + WALL_H / 2, HALL.north + 1]}>
        <boxGeometry args={[W, WALL_H, 2]} />
      </mesh>
      <mesh material={res.wallMat} position={[CX, F + WALL_H / 2, HALL.south - 1]}>
        <boxGeometry args={[W, WALL_H, 2]} />
      </mesh>
      {/* West wall with the workshop sign */}
      <mesh material={res.wallShortMat} position={[HALL.west - 1, F + HALL.height / 2, CZ]}>
        <boxGeometry args={[2, HALL.height + 4, D + 4]} />
      </mesh>
      <mesh material={res.signMat} position={[HALL.west + 0.05, F + 30, CZ]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[44, 11]} />
      </mesh>
      {/* East wall with openings */}
      <mesh geometry={res.eastWall} material={res.wallShortMat} />
      {/* Vault and timber ribs */}
      <mesh geometry={res.vault} material={res.vaultMat} position={[CX, F + WALL_H, CZ]} scale={[1, VAULT_SCALE, 1]} />
      <instancedMesh ref={ribs} args={[res.rib, res.timber, layout.ribM.length]} />
      {[-30, 0, 30].map((dz) => (
        <mesh key={dz} material={res.timber} position={[CX, F + WALL_H + VAULT_SCALE * Math.sqrt((D / 2) ** 2 - dz * dz) - 1.2, CZ + dz]}>
          <boxGeometry args={[W, 1.0, 1.0]} />
        </mesh>
      ))}
      {[HALL.north + 2.5, HALL.south - 2.5].map((z) => (
        <mesh key={z} material={res.timber} position={[CX, F + WALL_H - 0.5, z]}>
          <boxGeometry args={[W, 1.4, 3]} />
        </mesh>
      ))}
      {/* Pendant lanterns, chains and their pools of light */}
      <instancedMesh ref={lamps} args={[res.lampGeo, res.lampMat, layout.lampM.length]} />
      <instancedMesh ref={chains} args={[res.chainGeo, res.iron, layout.chainM.length]} />
      <instancedMesh ref={pools} args={[res.poolGeo, res.poolMat, layout.poolM.length]} renderOrder={2} />
      {/* Track, buffers and Workshop Halt platform */}
      <instancedMesh ref={rails} args={[res.railGeo, res.steel, layout.railM.length]} />
      <instancedMesh ref={sleepers} args={[res.sleeperGeo, res.sleeperMat, layout.sleeperM.length]} />
      <mesh material={res.iron} position={[layout.bufferX.x - 1, F + 0.9, layout.bufferX.z]}>
        <boxGeometry args={[0.8, 1.1, 3.2]} />
      </mesh>
      <mesh material={res.platformMat} position={[-660, F + 0.6, railZ - 7.6]}>
        <boxGeometry args={[100, 1.2, 8]} />
      </mesh>
      <mesh material={res.brass} position={[-660, F + 1.22, railZ - 3.9]}>
        <boxGeometry args={[100, 0.06, 0.4]} />
      </mesh>
      {/* Gallery through the rock: floor, walls, ceiling (seen from inside) */}
      <group position={[gx, 0, GALLERY.z]}>
        <mesh material={res.floorMat} position={[0, GALLERY.y - 0.25, 0]}>
          <boxGeometry args={[galleryLen, 0.5, GALLERY.width]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={res.wallMat} position={[0, GALLERY.y + GALLERY.height / 2, s * (GALLERY.width / 2 + 0.5)]}>
            <boxGeometry args={[galleryLen, GALLERY.height, 1]} />
          </mesh>
        ))}
        <mesh material={res.timber} position={[0, GALLERY.y + GALLERY.height + 0.5, 0]}>
          <boxGeometry args={[galleryLen, 1, GALLERY.width + 2]} />
        </mesh>
        <mesh material={res.iron} position={[0, GALLERY.y + 0.35, 0]}>
          <boxGeometry args={[galleryLen, 0.7, 1.6]} />
        </mesh>
      </group>
      <instancedMesh ref={galleryLamps} args={[res.lampGeo, res.lampMat, layout.gl.length]} />
      {/* Mouth facade on the mountain face */}
      <group position={[MOUTH_X, GALLERY.y, GALLERY.z]}>
        {/* Stone frame: two piers and a lintel around the opening */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={res.wallShortMat} position={[1.5, GALLERY.height / 2 + 1, s * (GALLERY.width / 2 + 2)]}>
            <boxGeometry args={[3, GALLERY.height + 6, 4]} />
          </mesh>
        ))}
        <mesh material={res.wallShortMat} position={[1.5, GALLERY.height + 2.5, 0]}>
          <boxGeometry args={[3, 3, GALLERY.width + 8]} />
        </mesh>
        <mesh material={res.brass} position={[3.2, GALLERY.height / 2 - 0.2, 0]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[GALLERY.width / 2 + 0.8, 0.28, 8, 40]} />
        </mesh>
        {/* The round door, hinged on its south edge */}
        <group ref={door} position={[3.3, GALLERY.height / 2 - 0.2, -(GALLERY.width / 2 + 0.6)]}>
          <mesh geometry={res.door} material={res.doorMat} position={[0, 0, GALLERY.width / 2 + 0.6]} rotation-y={Math.PI / 2} />
          <mesh material={res.brass} position={[0.65, 0, GALLERY.width / 2 + 0.6]} rotation-y={Math.PI / 2}>
            <torusGeometry args={[1.2, 0.12, 8, 24]} />
          </mesh>
        </group>
        {[-1, 1].map((s) => (
          <mesh key={s} material={res.lampMat} position={[3.4, GALLERY.height + 0.8, s * (GALLERY.width / 2 + 2)]}>
            <sphereGeometry args={[0.5, 12, 8]} />
          </mesh>
        ))}
        <mesh material={res.snow} position={[1.6, GALLERY.height + 4.2, 0]}>
          <boxGeometry args={[3.4, 0.4, GALLERY.width + 8.4]} />
        </mesh>
      </group>
      {/* Balcony, posts, railings and the Gift Line bullwheel */}
      <group>
        <mesh material={res.timber} position={[balconyX, balconyY - 0.3, GALLERY.z]}>
          <boxGeometry args={[30, 0.6, 14]} />
        </mesh>
        <mesh material={res.snow} position={[balconyX, balconyY + 0.04, GALLERY.z]}>
          <boxGeometry args={[29.6, 0.08, 13.6]} />
        </mesh>
        {posts.flatMap((x) =>
          [-6, 6].map((dz) => {
            const ground = heightAt(x, GALLERY.z + dz)
            const h = Math.max(1, balconyY - ground)
            return (
              <mesh key={`${x}${dz}`} material={res.timber} position={[x, ground + h / 2, GALLERY.z + dz]}>
                <boxGeometry args={[0.8, h, 0.8]} />
              </mesh>
            )
          }),
        )}
        {[-6.8, 6.8].map((dz) => (
          <mesh key={dz} material={res.iron} position={[balconyX + 1, balconyY + 1.1, GALLERY.z + dz]}>
            <boxGeometry args={[28, 0.1, 0.1]} />
          </mesh>
        ))}
        <group ref={bullwheel} position={[MOUTH_X + 26, balconyY + 6.5, GALLERY.z]}>
          <mesh material={res.iron} rotation-x={Math.PI / 2}>
            <torusGeometry args={[2.4, 0.18, 8, 32]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} material={res.iron} rotation-y={(i * Math.PI) / 4}>
              <boxGeometry args={[4.8, 0.12, 0.12]} />
            </mesh>
          ))}
        </group>
        <mesh material={res.iron} position={[MOUTH_X + 26, balconyY + 3.2, GALLERY.z]}>
          <cylinderGeometry args={[0.25, 0.35, 6.6, 8]} />
        </mesh>
        <mesh material={res.lampMat} position={[MOUTH_X + 26, balconyY + 7.4, GALLERY.z]}>
          <sphereGeometry args={[0.4, 10, 8]} />
        </mesh>
      </group>
      {/* Brass handrail along the balcony edge (catches the lantern light) */}
      <mesh material={res.brass} position={[balconyX + 14.9, balconyY + 1.1, GALLERY.z]}>
        <boxGeometry args={[0.12, 0.12, 13.6]} />
      </mesh>
    </group>
  )
}
