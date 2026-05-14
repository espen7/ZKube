import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createFileChangeFilter,
  createStartupQuietPeriodGuard,
  shouldHandleElectronExit,
} from './dev-electron-runtime.mjs'
import { ensureUrlPortAvailable } from './dev-server-port.mjs'
import { buildViteDevArgs, normalizeSpawnCommand } from './spawn-command.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')
const isWindows = process.platform === 'win32'
const viteBin = path.join(rootDir, 'node_modules', '.bin', isWindows ? 'vite.cmd' : 'vite')
const electronBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  isWindows ? 'electron.cmd' : 'electron',
)
const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
const mainBundlePath = path.join(rootDir, 'dist-electron', 'main', 'index.cjs')
const preloadBundlePath = path.join(
  rootDir,
  'dist-electron',
  'preload',
  'index.cjs',
)

/** @type {Set<import('node:child_process').ChildProcess>} */
const backgroundChildren = new Set()
/** @type {fs.FSWatcher[]} */
const fileWatchers = []
const watchStartupQuietPeriodMs = 1_500

let electronProcess = null
let restartTimer = null
let isRestartingElectron = false
let isShuttingDown = false
const shouldRestartForFileChange = createFileChangeFilter()
let isWatchRuntimeReady = () => true

function log(message) {
  process.stdout.write(`[dev:electron] ${message}\n`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function spawnProcess(command, args, options = {}) {
  const normalized = normalizeSpawnCommand(command, args, process.platform)
  const child = spawn(normalized.command, normalized.args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: normalized.shell ?? false,
    env: {
      ...process.env,
      ...options.env,
    },
  })

  child.on('error', (error) => {
    log(`${command} failed to start: ${error.message}`)
    void shutdown(1)
  })

  return child
}

function spawnBackground(command, args, options = {}) {
  const child = spawnProcess(command, args, options)
  backgroundChildren.add(child)

  child.on('exit', (code, signal) => {
    backgroundChildren.delete(child)

    if (isShuttingDown) {
      return
    }

    if (code !== 0) {
      const details =
        signal == null ? `exit code ${code}` : `signal ${signal}`
      log(`${path.basename(command)} stopped unexpectedly with ${details}.`)
      void shutdown(code ?? 1)
    }
  })

  return child
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const normalized = normalizeSpawnCommand(command, args, process.platform)
    const child = spawn(normalized.command, normalized.args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: normalized.shell ?? false,
      env: {
        ...process.env,
        ...options.env,
      },
    })

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve(undefined)
        return
      }

      const details =
        signal == null ? `exit code ${code}` : `signal ${signal}`
      reject(new Error(`${path.basename(command)} failed with ${details}.`))
    })
  })
}

async function waitForDevServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status < 500) {
        return
      }
    } catch {
      // The dev server is still starting up.
    }

    await sleep(500)
  }

  throw new Error(`Timed out waiting for Vite dev server at ${url}.`)
}

async function waitForFile(filePath, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      await fs.promises.access(filePath)
      return
    } catch {
      await sleep(200)
    }
  }

  throw new Error(`Timed out waiting for ${path.relative(rootDir, filePath)}.`)
}

function watchFile(filePath) {
  const watcher = fs.watch(filePath, () => {
    const relativePath = path.relative(rootDir, filePath)
    if (!isWatchRuntimeReady()) {
      return
    }

    if (!shouldRestartForFileChange(relativePath)) {
      return
    }

    scheduleElectronRestart(relativePath)
  })

  fileWatchers.push(watcher)
}

function scheduleElectronRestart(reason) {
  if (isShuttingDown) {
    return
  }

  if (restartTimer) {
    clearTimeout(restartTimer)
  }

  restartTimer = setTimeout(() => {
    restartTimer = null
    void restartElectron(reason)
  }, 250)
}

async function terminateChild(child) {
  if (!child || child.exitCode != null) {
    return
  }

  if (isWindows) {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
      })

      killer.on('error', () => resolve(undefined))
      killer.on('exit', () => resolve(undefined))
    })

    return
  }

  child.kill('SIGTERM')

  await Promise.race([
    new Promise((resolve) => child.once('exit', () => resolve(undefined))),
    sleep(5000).then(() => {
      if (child.exitCode == null) {
        child.kill('SIGKILL')
      }
    }),
  ])
}

function launchElectron() {
  log('Launching Electron window...')

  const child = spawnProcess(electronBin, ['.'], {
    env: { VITE_DEV_SERVER_URL: devServerUrl },
  })

  child.on('exit', (code, signal) => {
    if (
      !shouldHandleElectronExit({
        exitedPid: child.pid,
        activePid: electronProcess?.pid,
        isShuttingDown,
        isRestartingElectron,
      })
    ) {
      return
    }

    const details =
      signal == null ? `exit code ${code ?? 0}` : `signal ${signal}`
    log(`Electron exited with ${details}. Shutting down dev session.`)
    void shutdown(code ?? 0)
  })

  electronProcess = child
}

async function restartElectron(reason) {
  if (isRestartingElectron || isShuttingDown) {
    return
  }

  isRestartingElectron = true
  log(`Electron bundle changed (${reason}). Restarting...`)

  try {
    await terminateChild(electronProcess)
    launchElectron()
  } finally {
    isRestartingElectron = false
  }
}

async function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true

  if (restartTimer) {
    clearTimeout(restartTimer)
  }

  for (const watcher of fileWatchers) {
    watcher.close()
  }

  await terminateChild(electronProcess)

  const children = Array.from(backgroundChildren)
  await Promise.all(children.map((child) => terminateChild(child)))

  process.exit(exitCode)
}

async function main() {
  await ensureUrlPortAvailable(devServerUrl)

  log('Starting Vite renderer dev server...')
  spawnBackground(viteBin, buildViteDevArgs(devServerUrl))

  await waitForDevServer(devServerUrl)
  log(`Renderer dev server is ready at ${devServerUrl}.`)

  log('Building Electron main bundle...')
  await runCommand(viteBin, ['build', '--mode', 'electron-main'])

  log('Building Electron preload bundle...')
  await runCommand(viteBin, ['build', '--mode', 'electron-preload'])

  log('Watching Electron bundles for changes...')
  spawnBackground(viteBin, ['build', '--mode', 'electron-main', '--watch'])
  spawnBackground(viteBin, ['build', '--mode', 'electron-preload', '--watch'])

  await waitForFile(mainBundlePath)
  await waitForFile(preloadBundlePath)
  isWatchRuntimeReady = createStartupQuietPeriodGuard(watchStartupQuietPeriodMs)
  watchFile(mainBundlePath)
  watchFile(preloadBundlePath)

  launchElectron()
}

process.on('SIGINT', () => {
  log('Received SIGINT. Cleaning up...')
  void shutdown(0)
})

process.on('SIGTERM', () => {
  log('Received SIGTERM. Cleaning up...')
  void shutdown(0)
})

void main().catch((error) => {
  log(error instanceof Error ? error.message : String(error))
  void shutdown(1)
})
