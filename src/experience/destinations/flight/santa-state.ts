import { Vector3 } from 'three'

/** Santa's live state (world-space hands for the reins; whether he is visible yet). */
export const santaState = {
  hands: [new Vector3(), new Vector3()],
  visible: false,
}
