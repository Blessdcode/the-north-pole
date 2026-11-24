import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // R3F idiom: three.js objects are mutated imperatively inside useFrame so
    // per-frame values never go through React state. The compiler-oriented
    // immutability rule cannot model that, so it is disabled for the 3D engine only.
    files: ['src/experience/**/*.{ts,tsx}'],
    rules: { 'react-hooks/immutability': 'off' },
  },
])
