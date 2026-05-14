import net from 'node:net'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

const servers = new Set<net.Server>()

afterEach(async () => {
  await Promise.all(
    Array.from(servers, (server) =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      }),
    ),
  )

  servers.clear()
})

describe('dev server port guard', () => {
  it('rejects when the configured dev server port is already occupied', async () => {
    const server = net.createServer()
    servers.add(server)

    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', (error?: Error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })

    const address = server.address()
    if (address == null || typeof address === 'string') {
      throw new Error('Expected a TCP server address.')
    }

    const modulePath = pathToFileURL(
      path.resolve(process.cwd(), 'scripts', 'dev-server-port.mjs'),
    ).href

    const mod = (await import(modulePath)) as {
      ensureUrlPortAvailable: (url: string) => Promise<void>
    }

    await expect(
      mod.ensureUrlPortAvailable(`http://127.0.0.1:${address.port}`),
    ).rejects.toThrow(/already in use/i)
  })
})
