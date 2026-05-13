import { _electron as electron, test, expect } from '@playwright/test'

test('desktop app launches and shows workspace shell', async () => {
  const app = await electron.launch({ args: ['.'] })
  const appWindow = await app.firstWindow()
  const connectionId = `smoke-${Date.now()}`

  await expect(appWindow.getByText('ZKube')).toBeVisible()
  await expect
    .poll(async () =>
      appWindow.evaluate(async () => {
        const api = (globalThis as typeof globalThis & {
          zkube?: {
            app?: {
              ping: () => Promise<{ ok: true }>
            }
          }
        }).zkube

        if (!api?.app?.ping) {
          return { hasApi: false, ping: null }
        }

        return {
          hasApi: true,
          ping: await api.app.ping(),
        }
      }),
    )
    .toEqual({
      hasApi: true,
      ping: { ok: true },
    })
  await expect
    .poll(async () =>
      appWindow.evaluate(async ({ id }) => {
        const api = (globalThis as typeof globalThis & {
          zkube: {
            connections: {
              save: (draft: {
                id: string
                name: string
                hosts: string
              }) => Promise<unknown>
              list: () => Promise<Array<{ id: string }>>
            }
          }
        }).zkube

        await api.connections.save({
          id,
          name: 'Smoke Connection',
          hosts: '127.0.0.1:2181',
        })

        const connections = await api.connections.list()

        return connections.some((connection) => connection.id === id)
      }, { id: connectionId }),
    )
    .toBe(true)

  await app.close()
})
