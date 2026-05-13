import { _electron as electron, test, expect } from '@playwright/test'

test('desktop app launches and shows workspace shell', async () => {
  const app = await electron.launch({ args: ['.'] })
  const window = await app.firstWindow()

  await expect(window.getByText('ZKube')).toBeVisible()
  await expect
    .poll(async () =>
      window.evaluate(async () => {
        const api = (
          globalThis as typeof globalThis & {
            zkube?: {
              app?: {
                ping: () => Promise<{ ok: true }>
              }
            }
          }
        ).zkube

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

  await app.close()
})
