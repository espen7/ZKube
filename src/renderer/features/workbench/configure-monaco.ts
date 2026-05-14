import loader from '@monaco-editor/loader'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

type MonacoWorkerFactory = new () => Worker

type MonacoEnvironmentShape = {
  getWorker: (_workerId: string, label: string) => Worker
}

declare global {
  interface Window {
    MonacoEnvironment?: MonacoEnvironmentShape
  }
}

let configurePromise: Promise<void> | null = null

function getWorkerFactory(label: string): MonacoWorkerFactory {
  if (label === 'json') {
    return jsonWorker
  }

  if (label === 'css' || label === 'scss' || label === 'less') {
    return cssWorker
  }

  if (label === 'html' || label === 'handlebars' || label === 'razor') {
    return htmlWorker
  }

  if (label === 'typescript' || label === 'javascript') {
    return tsWorker
  }

  return editorWorker
}

export function configureMonaco() {
  if (configurePromise) {
    return configurePromise
  }

  configurePromise = Promise.resolve().then(async () => {
    ;(globalThis as typeof globalThis & {
      MonacoEnvironment?: MonacoEnvironmentShape
    }).MonacoEnvironment = {
      getWorker: (_workerId, label) => new (getWorkerFactory(label))(),
    }

    loader.config({ monaco })
    await loader.init()
  })

  return configurePromise
}
