import net from 'node:net'

function parseUrlPort(url) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80)),
  }
}

export async function ensureUrlPortAvailable(url) {
  const { host, port } = parseUrlPort(url)

  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port })

    socket.once('connect', () => {
      socket.destroy()
      reject(
        new Error(
          `Port ${port} is already in use on ${host}. Stop the existing process or choose a different VITE_DEV_SERVER_URL.`,
        ),
      )
    })

    socket.once('error', (error) => {
      if (
        error != null &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'EHOSTUNREACH')
      ) {
        resolve(undefined)
        return
      }

      reject(error)
    })
  })
}
