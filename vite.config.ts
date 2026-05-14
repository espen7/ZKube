import { builtinModules } from 'node:module'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { createContentSecurityPolicy } from './config/content-security-policy'

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

export default defineConfig(({ mode, command }) => {
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
    plugins: [
      react(),
      {
        name: 'zkube-content-security-policy',
        transformIndexHtml(html) {
          const csp = createContentSecurityPolicy(
            command === 'serve' ? 'development' : 'production',
            process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173',
          )

          return html.replace(
            '</head>',
            `    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`,
          )
        },
      },
    ],
    test,
  }
})
