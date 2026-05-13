import { builtinModules } from 'node:module'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const test = {
  environment: 'jsdom',
  globals: true,
  setupFiles: 'src/renderer/test/setup.ts',
} as const

const nodeBuiltins = Array.from(
  new Set([
    ...builtinModules,
    ...builtinModules.map((moduleName) =>
      moduleName.startsWith('node:') ? moduleName : `node:${moduleName}`,
    ),
  ]),
)

const electronMainExternals = ['electron', 'node-zookeeper-client', ...nodeBuiltins]

export default defineConfig(({ mode }) => {
  if (mode === 'electron-main') {
    return {
      build: {
        emptyOutDir: true,
        lib: {
          entry: fileURLToPath(new URL('./electron/main/index.ts', import.meta.url)),
          formats: ['cjs'],
          fileName: () => 'index.cjs',
        },
        outDir: 'dist-electron/main',
        rollupOptions: {
          external: electronMainExternals,
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
          formats: ['cjs'],
          fileName: () => 'index.cjs',
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
