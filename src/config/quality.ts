export type QualityLevel = 'high' | 'balanced' | 'low'

export interface QualityProfile {
  maxDpr: number
  terrainSegments: number
  snowCount: number
  treeCount: number
  smokePerChimney: number
  steamCapacity: number
  postprocessing: boolean
  antialias: boolean
}

export const QUALITY: Record<QualityLevel, QualityProfile> = {
  high: {
    maxDpr: 1.75,
    terrainSegments: 360,
    snowCount: 14000,
    treeCount: 5200,
    smokePerChimney: 26,
    steamCapacity: 1600,
    postprocessing: true,
    antialias: false,
  },
  balanced: {
    maxDpr: 1.35,
    terrainSegments: 260,
    snowCount: 8000,
    treeCount: 3400,
    smokePerChimney: 18,
    steamCapacity: 1100,
    postprocessing: true,
    antialias: false,
  },
  low: {
    maxDpr: 1,
    terrainSegments: 170,
    snowCount: 3500,
    treeCount: 1800,
    smokePerChimney: 10,
    steamCapacity: 600,
    postprocessing: false,
    antialias: true,
  },
}

export function detectQuality(): QualityLevel {
  if (typeof window === 'undefined') return 'balanced'
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = Math.min(window.innerWidth, window.innerHeight) < 600
  const cores = navigator.hardwareConcurrency ?? 4
  if (coarse && small) return cores >= 8 ? 'balanced' : 'low'
  if (coarse || cores <= 4) return 'balanced'
  return 'high'
}

export function detectReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function detectWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}
