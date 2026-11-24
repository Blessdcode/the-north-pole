import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, PerspectiveCamera, ShaderMaterial, Vector2 } from 'three'
import { mulberry32 } from '../../../lib/math'
import { GLSL_NOISE } from '../../shaders/noise.glsl'
import { weather } from '../weather/weather-controller'
import { type ParticleEmitter, registerEmitter } from './steam-emitter'

/**
 * One GPU point system for all world-space vapour and spray.
 * A ring buffer: emitters write a particle's birth state once; the vertex
 * shader integrates its whole life analytically (drag, buoyancy, wind,
 * gravity) — no per-frame CPU work per particle.
 */
const vertexShader = /* glsl */ `
attribute vec3 aVel;
attribute vec2 aInfo; // x: birth time, y: kind
attribute float aSeed;
uniform float uTime;
uniform float uPxScale;
uniform vec2 uWind;
varying float vAlpha;
varying float vKind;
varying float vSeed;
varying float vT;

void main() {
  float kind = aInfo.y;
  float age = uTime - aInfo.x;
  float life = (kind < 0.5 ? 3.6 : (kind < 1.5 ? 1.7 : 1.1)) * (0.75 + aSeed * 0.5);
  float t = age / life;
  vKind = kind;
  vSeed = aSeed;
  vT = t;
  if (t < 0.0 || t > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    return;
  }
  float drag = kind < 1.5 ? 1.7 : 0.35;
  vec3 p = position + aVel * ((1.0 - exp(-drag * age)) / drag);
  if (kind < 1.5) {
    p.y += age * age * (kind < 0.5 ? 0.45 : 0.25);
    p.xz += uWind * age * age * 0.7;
  } else {
    p.y -= 2.7 * age * age;
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = kind < 0.5 ? (1.0 + t * 7.5) : (kind < 1.5 ? (0.45 + t * 3.6) : 0.12);
  gl_PointSize = clamp(size * uPxScale / max(-mv.z, 0.5), 0.0, 480.0);
  float fade = kind < 1.5 ? smoothstep(0.0, 0.07, t) * pow(1.0 - t, 1.4) : 1.0 - t;
  vAlpha = fade * (kind < 0.5 ? 0.5 : (kind < 1.5 ? 0.62 : 0.9));
}
`

const fragmentShader = /* glsl */ `
varying float vAlpha;
varying float vKind;
varying float vSeed;
varying float vT;
${GLSL_NOISE}
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float a;
  vec3 col;
  if (vKind > 1.5) {
    a = smoothstep(0.5, 0.1, d);
    col = vec3(0.95, 0.97, 1.0);
  } else {
    float n = np_noise(uv * 4.5 + vSeed * 17.0 + vT * 1.6);
    a = smoothstep(0.5, 0.05, d) * (0.5 + 0.5 * n);
    col = mix(vec3(0.97, 0.95, 0.92), vec3(0.6, 0.66, 0.78), smoothstep(0.0, 0.8, vT));
  }
  a *= vAlpha;
  if (a < 0.008) discard;
  gl_FragColor = vec4(col, a);
}
`

export function SteamSystem({ capacity }: { capacity: number }) {
  const { geometry, material, emitter } = useMemo(() => {
    const rand = mulberry32(404)
    const pos = new Float32Array(capacity * 3)
    const vel = new Float32Array(capacity * 3)
    const info = new Float32Array(capacity * 2).fill(-1e6)
    const seed = new Float32Array(capacity)
    for (let i = 0; i < capacity; i++) seed[i] = rand()
    const g = new BufferGeometry()
    const aPos = new BufferAttribute(pos, 3)
    const aVel = new BufferAttribute(vel, 3)
    const aInfo = new BufferAttribute(info, 2)
    g.setAttribute('position', aPos)
    g.setAttribute('aVel', aVel)
    g.setAttribute('aInfo', aInfo)
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))

    const m = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPxScale: { value: 600 },
        uWind: { value: new Vector2() },
      },
    })

    let head = 0
    let dirty = false
    const e: ParticleEmitter & { flush(): void } = {
      emit(time, kind, x, y, z, vx, vy, vz, count, spread) {
        for (let n = 0; n < count; n++) {
          const i = head
          head = (head + 1) % capacity
          const r = () => (rand() - 0.5) * 2
          pos[i * 3] = x + r() * spread * 0.35
          pos[i * 3 + 1] = y + r() * spread * 0.2
          pos[i * 3 + 2] = z + r() * spread * 0.35
          vel[i * 3] = vx + r() * spread
          vel[i * 3 + 1] = vy + r() * spread * 0.6
          vel[i * 3 + 2] = vz + r() * spread
          info[i * 2] = time - rand() * 0.03
          info[i * 2 + 1] = kind
        }
        dirty = true
      },
      flush() {
        if (!dirty) return
        aPos.needsUpdate = true
        aVel.needsUpdate = true
        aInfo.needsUpdate = true
        dirty = false
      },
    }
    return { geometry: g, material: m, emitter: e }
  }, [capacity])

  useEffect(() => {
    registerEmitter(emitter)
    return () => {
      registerEmitter(null)
      geometry.dispose()
      material.dispose()
    }
  }, [emitter, geometry, material])

  useFrame(({ clock, camera, size, gl }) => {
    emitter.flush()
    const u = material.uniforms
    u.uTime.value = clock.elapsedTime
    const fov = (camera as PerspectiveCamera).fov ?? 45
    u.uPxScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360))
    u.uWind.value.set(weather.windX, weather.windZ).multiplyScalar(0.6 + weather.wind)
  })

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={6} />
}
