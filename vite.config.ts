import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const test = {
  environment: 'jsdom',
  globals: true,
  setupFiles: 'src/renderer/test/setup.ts',
} as const

export default defineConfig(({ mode }) => {
  if (mode === 'electron-main') {
    return {
      build: {
        emptyOutDir: true,
        lib: {
          entry: fileURLToPath(new URL('./electron/main/index.ts', import.meta.url)),
          formats: ['es'],
          fileName: () => 'index.js',
        },
        outDir: 'dist-electron/main',
        rollupOptions: {
          external: ['electron', 'node:path', 'node:url'],
        },
      },
      test,
    }
  }

  if (mode === 'electron-preload') {
    return {
      build: {
        emptyOutDir: false,
        lib: {
          entry: fileURLToPath(
            new URL('./electron/preload/index.ts', import.meta.url),
          ),
          formats: ['es'],
          fileName: () => 'index.js',
        },
        outDir: 'dist-electron/preload',
        rollupOptions: {
          external: ['electron'],
        },
      },
      test,
    }
  }

  return {
    plugins: [react()],
    test,
  }
})
