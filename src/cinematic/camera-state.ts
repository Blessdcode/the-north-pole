import { Vector3 } from 'three'

/**
 * Where the camera was last frame (world space), written by the camera rig.
 * Systems that react to the camera's location (lighting rigs, interiors)
 * read this instead of reaching into the renderer.
 */
export const cameraState = {
  position: new Vector3(0, 70, 1780),
}
