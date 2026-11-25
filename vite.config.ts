import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks, so app changes don't invalidate the 3D engine.
        // Higher priority wins when a module could fall into several groups.
        codeSplitting: {
          groups: [
            { name: 'three', test: /[\\/]node_modules[\\/](\.pnpm[\\/]three@[^\\/]+[\\/]node_modules[\\/])?three[\\/]/, priority: 30 },
            { name: 'r3f', test: /@react-three|postprocessing/, priority: 20 },
            { name: 'motion', test: /gsap|lenis/, priority: 10 },
          ],
        },
      },
    },
  },
})
