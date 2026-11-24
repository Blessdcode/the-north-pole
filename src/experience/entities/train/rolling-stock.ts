import { ExtrudeGeometry, Shape, TorusGeometry } from 'three'
import { Kit } from './train-kit'

/**
 * Body builders for the Christmas Express. Dimensions in metres, loosely
 * after a 4-4-0 American-type locomotive with crimson-and-brass livery.
 * Vehicle frame: +z forward, y = 0 railhead, origin at the vehicle centre.
 */

export const LOCO = {
  length: 13.5,
  driverRadius: 0.92,
  driverZ: [2.7, 0.6, -1.5],
  driverX: 0.86,
  crank: 0.42,
  leadRadius: 0.45,
  leadZ: 5.25,
  trailRadius: 0.52,
  trailZ: -4.95,
  cylinderY: 1.55,
  cylinderZ: 4.45,
  rodLength: 2.7,
  chimneyTop: [0, 5.15, 5.75] as const,
  dome: [0, 4.35, 2.6] as const,
  whistle: [0, 4.3, -2.5] as const,
  lamp: [0, 4.12, 6.55] as const,
  pilot: [0, 0.35, 7.9] as const,
}

export function buildLocomotiveBody() {
  const k = new Kit()
  // Frames, running boards and valances (outside the driving wheels).
  for (const s of [-1, 1]) {
    k.box('black', 0.12, 0.7, 11, s * 0.55, 1.15, 0.5)
    k.box('black', 0.3, 0.1, 12.4, s * 1.16, 1.47, 0.3)
    k.box('livery', 0.24, 0.3, 12.2, s * 1.2, 1.28, 0.3)
    k.box('brass', 0.02, 0.04, 12.2, s * 1.325, 1.3, 0.3)
  }
  // Buffer beam, buffers, coupler.
  k.box('livery', 2.9, 0.62, 0.32, 0, 1.12, 6.55)
  k.box('brass', 2.9, 0.05, 0.34, 0, 1.4, 6.55)
  for (const s of [-1, 1]) {
    k.cylZ('black', 0.17, 0.5, s * 0.85, 1.12, 6.95, 12)
    k.cylZ('steel', 0.26, 0.06, s * 0.85, 1.12, 7.2, 16)
  }
  k.box('steel', 0.18, 0.18, 0.5, 0, 0.98, 6.95)
  // Pilot (cowcatcher).
  const pilot = new Shape()
  pilot.moveTo(0, 0)
  pilot.lineTo(1.35, 0)
  pilot.lineTo(0, 0.85)
  pilot.closePath()
  k.add('livery', new ExtrudeGeometry(pilot, { depth: 2.5, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(1.25, 0.12, 6.7))
  for (let i = -2; i <= 2; i++) k.box('black', 0.06, 0.05, 1.5, i * 0.45, 0.62, 7.35)
  // Smokebox, door, boiler and bands.
  k.cylZ('black', 1.06, 1.7, 0, 2.72, 5.7, 32)
  k.cylZ('black', 0.92, 0.1, 0, 2.72, 6.58, 32)
  k.bandZ('brass', 0.92, 0.04, 0, 2.72, 6.64)
  k.cylZ('brass', 0.05, 0.25, 0, 2.72, 6.75, 8)
  k.cylZ('livery', 1.0, 6.4, 0, 2.72, 1.65, 32)
  for (const z of [4.75, 3.4, 2.0, 0.6, -0.8, -1.48]) k.bandZ('brass', 1.006, 0.035, 0, 2.72, z)
  for (const s of [-1, 1]) k.cylZ('brass', 0.03, 7.0, s * 1.12, 3.2, 1.9, 6)
  // Chimney (diamond-ish flared stack) with brass rim.
  k.lathe(
    'black',
    [
      [0.36, 0],
      [0.31, 0.35],
      [0.3, 0.85],
      [0.4, 1.12],
      [0.53, 1.32],
      [0.5, 1.45],
      [0.001, 1.45],
    ],
    0,
    3.6,
    5.75,
  )
  k.add('brass', new TorusGeometry(0.52, 0.045, 6, 24).rotateX(Math.PI / 2).translate(0, 4.96, 5.75))
  // Steam dome and sand dome.
  k.cylY('brass', 0.46, 0.5, 0.5, 0, 3.75, 2.6)
  k.sphere('brass', 0.46, 0, 4.0, 2.6, true)
  k.cylY('livery', 0.38, 0.42, 0.4, 0, 3.7, 0.6)
  k.sphere('brass', 0.38, 0, 3.9, 0.6, true)
  // Bell on its yoke.
  k.lathe(
    'brass',
    [
      [0.001, 0.5],
      [0.1, 0.48],
      [0.18, 0.32],
      [0.26, 0.06],
      [0.3, 0],
    ],
    0,
    3.72,
    4.2,
  )
  k.box('black', 0.7, 0.08, 0.08, 0, 4.28, 4.2)
  for (const s of [-1, 1]) k.cylY('black', 0.04, 0.04, 0.6, s * 0.33, 3.98, 4.2, 6)
  // Headlamp: big box lamp on the smokebox.
  k.box('black', 0.3, 0.55, 0.3, 0, 3.75, 6.0)
  k.box('black', 0.85, 0.9, 0.85, 0, 4.15, 6.05)
  k.box('brass', 0.65, 0.12, 0.72, 0, 4.66, 6.05)
  k.cylZ('lamp', 0.31, 0.05, 0, 4.12, 6.49, 24)
  k.bandZ('brass', 0.33, 0.04, 0, 4.12, 6.5)
  // Whistle.
  k.cylY('brass', 0.07, 0.07, 0.45, 0, 3.95, -2.5, 10)
  // Cylinders, steam chests, guide bars.
  for (const s of [-1, 1]) {
    k.cylZ('black', 0.44, 1.5, s * 1.22, 1.55, 4.45, 20)
    k.bandZ('brass', 0.445, 0.05, s * 1.22, 1.55, 5.2)
    k.bandZ('brass', 0.445, 0.05, s * 1.22, 1.55, 3.7)
    k.box('black', 0.52, 0.48, 1.4, s * 1.22, 2.1, 4.45)
    k.cylY('black', 0.12, 0.12, 0.9, s * 0.95, 2.5, 4.95, 8)
    k.box('steel', 0.08, 0.06, 1.7, s * 1.1, 1.74, 3.1)
    k.box('steel', 0.08, 0.06, 1.7, s * 1.1, 1.36, 3.1)
  }
  // Firebox and cab.
  k.box('livery', 2.1, 1.0, 2.0, 0, 1.95, -2.35)
  k.box('livery', 2.9, 2.7, 3.3, 0, 2.95, -4.75)
  k.box('black', 3.3, 0.16, 3.9, 0, 4.38, -4.75)
  k.box('snow', 3.1, 0.12, 3.6, 0, 4.5, -4.75)
  for (const s of [-1, 1]) {
    const f = s > 0 ? 'x+' : 'x-'
    k.panel('window', 0.95, 0.85, s * 1.455, 3.6, -4.3, f)
    k.panel('window', 0.7, 0.85, s * 1.455, 3.6, -5.55, f)
    k.panel('plate', 1.7, 0.37, s * 1.456, 2.35, -4.75, f)
    k.box('brass', 0.02, 0.04, 3.3, s * 1.455, 2.0, -4.75)
    k.box('brass', 0.02, 0.04, 3.3, s * 1.455, 4.18, -4.75)
    k.panel('window', 0.5, 0.5, s * 0.95, 3.8, -3.09, 'z+')
  }
  k.panel('firebox', 1.2, 1.2, 0, 2.6, -6.41, 'z-')
  return k.build()
}

export function buildTenderBody() {
  const k = new Kit()
  k.box('black', 2.7, 0.3, 7.4, 0, 1.35, 0)
  k.box('livery', 2.85, 2.0, 7.2, 0, 2.55, 0)
  for (const s of [-1, 1]) {
    k.box('brass', 0.02, 0.04, 7.2, s * 1.43, 1.7, 0)
    k.box('brass', 0.02, 0.04, 7.2, s * 1.43, 3.45, 0)
    k.box('black', 2.2, 0.4, 2.4, 0, 0.85, s * 2.3)
  }
  k.box('livery', 2.95, 0.18, 7.3, 0, 3.6, 0)
  k.box('coal', 2.4, 0.6, 4.6, 0, 3.8, 0.9)
  for (let i = 0; i < 9; i++) k.box('coal', 0.5, 0.35, 0.5, ((i * 37) % 9) / 4 - 1, 4.15, 2.6 - i * 0.45)
  k.box('snow', 2.1, 0.08, 3.2, 0, 4.13, 0.4)
  k.box('snow', 2.7, 0.1, 2.0, 0, 3.75, -2.5)
  k.cylY('black', 0.35, 0.35, 0.18, 0, 3.8, -2.6, 16)
  return k.build()
}

export function buildCarriageBody(lastCar: boolean) {
  const k = new Kit()
  k.box('black', 2.7, 0.4, 15.8, 0, 1.25, 0)
  k.box('livery', 2.95, 2.55, 15.6, 0, 2.75, 0)
  for (const s of [-1, 1]) {
    const f = s > 0 ? 'x+' : 'x-'
    k.box('brass', 0.02, 0.05, 15.6, s * 1.478, 2.45, 0)
    k.box('brass', 0.02, 0.05, 15.6, s * 1.478, 3.85, 0)
    for (let i = 0; i < 9; i++) k.panel('window', 0.95, 1.0, s * 1.479, 3.15, -6.0 + i * 1.5, f)
    k.panel('black', 0.85, 2.0, s * 1.479, 2.7, 7.25, f)
    k.panel('black', 0.85, 2.0, s * 1.479, 2.7, -7.25, f)
    k.panel('window', 12.6, 0.22, s * 0.752, 4.46, 0, f)
    k.box('black', 2.3, 0.45, 2.6, 0, 0.85, s * 5.6)
    k.box('black', 1.7, 2.3, 0.5, 0, 2.8, s * 8.0)
  }
  k.box('black', 3.1, 0.2, 15.9, 0, 4.12, 0)
  k.box('snow', 3.0, 0.1, 15.4, 0, 4.24, 0)
  k.box('livery', 1.5, 0.48, 13.4, 0, 4.46, 0)
  k.box('black', 1.7, 0.08, 13.6, 0, 4.72, 0)
  k.box('snow', 1.55, 0.1, 13.2, 0, 4.8, 0)
  if (lastCar) {
    // Tail lamp.
    k.cylZ('firebox', 0.16, 0.12, 1.1, 3.6, -8.28, 12)
  }
  return k.build()
}
