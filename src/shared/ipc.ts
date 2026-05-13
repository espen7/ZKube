export type Transport = {
  invoke<T>(channel: string, payload?: unknown): Promise<T>
  on<T>(channel: string, cb: (payload: T) => void): () => void
}

export const channels = {
  appGetVersion: 'app:getVersion',
  appPing: 'app:ping',
  runtimeEvent: 'runtime:event',
} as const

export function createDesktopApi(transport: Transport) {
  return {
    app: {
      getVersion: () =>
        transport.invoke<{ version: string }>(channels.appGetVersion, undefined),
      ping: () => transport.invoke<{ ok: true }>(channels.appPing, undefined),
    },
    runtime: {
      subscribe: (cb: (payload: unknown) => void) =>
        transport.on(channels.runtimeEvent, cb),
    },
  }
}
