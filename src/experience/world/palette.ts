import { Color, Vector3 } from 'three'

/**
 * Colour script for the night. Cold blue world, warm golden village.
 * Fog colour must equal the sky's horizon colour so silhouettes dissolve
 * seamlessly into the atmosphere.
 */
export const PALETTE = {
  zenith: new Color('#010309'),
  skyMid: new Color('#04102a'),
  horizon: new Color('#13264a'),
  fog: new Color('#0d1b36'),
  moonlight: new Color('#9db8ff'),
  hemiSky: new Color('#3f5f9e'),
  hemiGround: new Color('#070a14'),
  snow: new Color('#c9d6f2'),
  rock: new Color('#1a1f2c'),
  warm: new Color('#ffad5c'),
  warmDeep: new Color('#ff8a3a'),
}

/** Moon high in the north-east, so it sits in frame above the aurora. */
export const MOON_DIRECTION = new Vector3(0.52, 0.36, -0.78).normalize()
