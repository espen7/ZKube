export function shouldHandleElectronExit({
  exitedPid,
  activePid,
  isShuttingDown,
  isRestartingElectron,
}) {
  if (isShuttingDown || isRestartingElectron) {
    return false
  }

  return exitedPid != null && activePid != null && exitedPid === activePid
}

export function createFileChangeFilter() {
  const seenPaths = new Set()

  return (filePath) => {
    if (!seenPaths.has(filePath)) {
      seenPaths.add(filePath)
      return false
    }

    return true
  }
}

export function createStartupQuietPeriodGuard(quietPeriodMs, now = () => Date.now()) {
  const readyAt = now() + quietPeriodMs

  return () => now() >= readyAt
}
