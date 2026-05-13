import type { RuntimeEvent } from './models/node'

export const channels = {
  appGetVersion: 'app:getVersion',
  appPing: 'app:ping',
  runtimeEvent: 'runtime:event',
} as const

export type RuntimeEventPayload = RuntimeEvent

export type InvokeRequestMap = {
  [channels.appGetVersion]: undefined
  [channels.appPing]: undefined
}

export type InvokeResponseMap = {
  [channels.appGetVersion]: { version: string }
  [channels.appPing]: { ok: true }
}

export type EventPayloadMap = {
  [channels.runtimeEvent]: RuntimeEventPayload
}

export type InvokeChannel = keyof InvokeRequestMap
export type EventChannel = keyof EventPayloadMap

export interface Transport {
  invoke<TChannel extends InvokeChannel>(
    channel: TChannel,
    payload: InvokeRequestMap[TChannel],
  ): Promise<InvokeResponseMap[TChannel]>
  on<TChannel extends EventChannel>(
    channel: TChannel,
    cb: (payload: EventPayloadMap[TChannel]) => void,
  ): () => void
}

export interface DesktopApi {
  app: {
    getVersion(): Promise<InvokeResponseMap[typeof channels.appGetVersion]>
    ping(): Promise<InvokeResponseMap[typeof channels.appPing]>
  }
  runtime: {
    subscribe(cb: (payload: RuntimeEventPayload) => void): () => void
  }
}

export function createDesktopApi(transport: Transport): DesktopApi {
  return {
    app: {
      getVersion: () => transport.invoke(channels.appGetVersion, undefined),
      ping: () => transport.invoke(channels.appPing, undefined),
    },
    runtime: {
      subscribe: (cb) => transport.on(channels.runtimeEvent, cb),
    },
  }
}
