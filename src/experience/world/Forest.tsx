import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { buildSpruceGeometry, scatterTrees } from './forest-assets'

export function Forest({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => buildSpruceGeometry(), [])
  const material = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }),
    [],
  )
  const trees = useMemo(() => scatterTrees(count), [count])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const o = new Object3D()
    const tint = new Color()
    trees.forEach((t, i) => {
      o.position.set(t.x, t.y, t.z)
      o.rotation.set((t.tint - 0.5) * 0.06, t.r, (t.tint - 0.5) * 0.05)
      o.scale.set(t.s * (0.9 + t.tint * 0.2), t.s, t.s * (0.9 + t.tint * 0.2))
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      tint.setScalar(0.82 + t.tint * 0.3)
      m.setColorAt(i, tint)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [trees])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return (
    <instancedMesh
      ref={mesh}
      name="Forest"
      args={[geometry, material, trees.length]}
      receiveShadow
    />
  )
}
