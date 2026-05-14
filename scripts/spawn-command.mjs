import path from 'node:path'

export function normalizeSpawnCommand(command, args, platform) {
  if (platform === 'win32') {
    const extension = path.extname(command).toLowerCase()
    if (extension === '.cmd' || extension === '.bat') {
      return {
        command,
        args,
        shell: true,
      }
    }
  }

  return {
    command,
    args,
  }
}

export function buildViteDevArgs(url) {
  const parsed = new URL(url)
  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80')

  return ['--strictPort', '--port', port]
}
