import type { DesktopApi } from './ipc'

declare global {
  interface Window {
    zkube: DesktopApi
  }
}

export {}
