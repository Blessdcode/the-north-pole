import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, ShaderMaterial, Vector2, Vector3 } from 'three'
import { mulberry32 } from '../../../lib/math'
import { timeOfDay } from '../lighting/time-of-day'
import { weather } from './weather-controller'

const vertexShader = /* glsl */ `
attribute vec4 aRand;
uniform float uTime;
uniform vec3 uBox;
uniform vec3 uCenter;
uniform vec2 uDrift;
uniform float uFall;
uniform float uIntensity;
uniform float uSize;
uniform float uPixelRatio;
varying float vAlpha;

void main() {
  vec3 p = position * uBox;
  float speed = 0.55 + aRand.x * 0.9;
  p.y -= uTime * uFall * speed;
  p.xz += uDrift * (0.7 + aRand.y * 0.6);
  // Tumbling flutter.
  float ph = aRand.z * 40.0;
  p.x += sin(uTime * (0.6 + aRand.y) + ph) * 1.4;
  p.z += cos(uTime * (0.5 + aRand.x) + ph) * 1.4;

  // Wrap the volume around the camera so snow is infinite and cheap.
  vec3 origin = uCenter - uBox * 0.5;
  p = mod(p - origin, uBox) + origin;

  vec3 rel = (p - uCenter) / (uBox * 0.5);
  float edge = max(max(abs(rel.x), abs(rel.y)), abs(rel.z));
  float visible = step(aRand.w, uIntensity);
  vAlpha = (1.0 - smoothstep(0.7, 1.0, edge)) * visible;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  vAlpha *= smoothstep(0.6, 3.0, dist);
  gl_Position = projectionMatrix * mv;
  float size = uSize * (0.45 + aRand.z * aRand.z * 1.4) * uPixelRatio * (80.0 / max(dist, 0.1));
  gl_PointSize = min(size, 48.0) * visible;
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.05, d);
  a *= a;
  if (a * vAlpha < 0.01) discard;
  gl_FragColor = vec4(uColor, a * vAlpha * 0.85);
}
`

const BOX = new Vector3(150, 90, 150)

export function Snowfall({ count }: { count: number }) {
  const { camera, gl } = useThree()

  const geometry = useMemo(() => {
    const rand = mulberry32(2025)
    const positions = new Float32Array(count * 3)
    const randoms = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = rand()
      positions[i * 3 + 1] = rand()
      positions[i * 3 + 2] = rand()
      randoms[i * 4] = rand()
      randoms[i * 4 + 1] = rand()
      randoms[i * 4 + 2] = rand()
      randoms[i * 4 + 3] = rand()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(positions, 3))
    g.setAttribute('aRand', new BufferAttribute(randoms, 4))
    return g
  }, [count])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uBox: { value: BOX },
          uCenter: { value: new Vector3() },
          uDrift: { value: new Vector2() },
          uFall: { value: 3.2 },
          uIntensity: { value: 0 },
          uSize: { value: 0.9 },
          uPixelRatio: { value: 1 },
          uColor: { value: new Vector3(0.86, 0.9, 1.0) },
        },
      }),
    [],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const drift = useMemo(() => ({ x: 0, z: 0 }), [])

  useFrame(({ clock }, dt) => {
    const u = material.uniforms
    u.uTime.value = clock.elapsedTime
    camera.getWorldPosition(u.uCenter.value)
    // Integrate wind so changes in strength never cause the field to jump.
    const step = Math.min(dt, 0.05) * (2 + weather.wind * 9 + weather.surge * 30)
    drift.x += weather.windX * step
    drift.z += weather.windZ * step
    // Wrap the accumulated drift by the box size to keep float precision over long sessions.
    drift.x %= BOX.x
    drift.z %= BOX.z
    u.uDrift.value.set(drift.x, drift.z)
    u.uIntensity.value = Math.min(1, weather.snow + weather.surge * 0.6)
    u.uPixelRatio.value = gl.getPixelRatio()
    const d = timeOfDay.dawn
    u.uColor.value.set(0.86 + d * 0.14, 0.9 + d * 0.02, 1.0 - d * 0.12)
  })

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={10} />
}
