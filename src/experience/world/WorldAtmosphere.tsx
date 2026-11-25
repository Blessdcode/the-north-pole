import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { FogExp2, ShaderChunk } from 'three'
import { weather } from '../systems/weather/weather-controller'
import { PALETTE } from './palette'

/**
 * Atmospheric perspective.
 * Extends three's exponential fog with a height term so cold mist pools in
 * valleys and the village bowl while peaks rise clear into the night.
 * Patched once, globally, before any material compiles.
 */
let patched = false
function patchHeightFog() {
  if (patched) return
  patched = true
  ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying float vFogDepth;
  varying float vFogWorldY;
#endif`
  ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorldY = cameraPosition.y + ( transpose( mat3( viewMatrix ) ) * mvPosition.xyz ).y;
#endif`
  ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying float vFogWorldY;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`
  ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
    // Valley mist: dense near the ground, thinning with altitude, needs distance to build.
    float heightMist = exp( - max( vFogWorldY - 4.0, 0.0 ) * 0.0105 );
    float mistDepth = 1.0 - exp( - vFogDepth * 0.0011 );
    fogFactor = max( fogFactor, heightMist * mistDepth * 0.62 );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`
}
patchHeightFog()

export function WorldAtmosphere() {
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const fog = new FogExp2(PALETTE.fog.getHex(), weather.fog)
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [scene])

  useFrame(() => {
    if (scene.fog instanceof FogExp2) {
      scene.fog.density = weather.fog
      scene.fog.color.copy(PALETTE.fog)
    }
  })

  return null
}
