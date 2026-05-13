import type { createDesktopApi } from './ipc'

declare global {
  interface Window {
    zkube: ReturnType<typeof createDesktopApi>
  }
}

export {}
