import { beforeEach, describe, expect, it, vi } from 'vitest'

const loaderConfigMock = vi.fn()
const loaderInitMock = vi.fn().mockResolvedValue(undefined)
const monacoStub = { editor: { createModel: vi.fn() } }

class BaseWorkerMock {}
class JsonWorkerMock {}
class CssWorkerMock {}
class HtmlWorkerMock {}
class TsWorkerMock {}

vi.mock('@monaco-editor/loader', () => ({
  default: {
    config: loaderConfigMock,
    init: loaderInitMock,
  },
}))

vi.mock('monaco-editor', () => monacoStub)
vi.mock('monaco-editor/esm/vs/editor/editor.worker?worker', () => ({
  default: BaseWorkerMock,
}))
vi.mock('monaco-editor/esm/vs/language/json/json.worker?worker', () => ({
  default: JsonWorkerMock,
}))
vi.mock('monaco-editor/esm/vs/language/css/css.worker?worker', () => ({
  default: CssWorkerMock,
}))
vi.mock('monaco-editor/esm/vs/language/html/html.worker?worker', () => ({
  default: HtmlWorkerMock,
}))
vi.mock('monaco-editor/esm/vs/language/typescript/ts.worker?worker', () => ({
  default: TsWorkerMock,
}))

describe('configureMonaco', () => {
  beforeEach(() => {
    loaderConfigMock.mockClear()
    loaderInitMock.mockClear()
    delete (globalThis as typeof globalThis & {
      MonacoEnvironment?: unknown
    }).MonacoEnvironment
  })

  it('configures monaco to use bundled workers instead of the CDN loader', async () => {
    const { configureMonaco } = await import(
      '../../src/renderer/features/workbench/configure-monaco'
    )

    await configureMonaco()

    expect(loaderConfigMock).toHaveBeenCalledWith({ monaco: monacoStub })
    expect(loaderInitMock).toHaveBeenCalledTimes(1)

    const environment = (globalThis as typeof globalThis & {
      MonacoEnvironment?: {
        getWorker: (_: string, label: string) => unknown
      }
    }).MonacoEnvironment

    expect(environment).toBeDefined()
    expect(environment?.getWorker('', 'json')).toBeInstanceOf(JsonWorkerMock)
    expect(environment?.getWorker('', 'css')).toBeInstanceOf(CssWorkerMock)
    expect(environment?.getWorker('', 'html')).toBeInstanceOf(HtmlWorkerMock)
    expect(environment?.getWorker('', 'typescript')).toBeInstanceOf(TsWorkerMock)
    expect(environment?.getWorker('', 'editorWorkerService')).toBeInstanceOf(
      BaseWorkerMock,
    )
  })
})
