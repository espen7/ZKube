import { _electron as electron, test, expect } from '@playwright/test'

test('desktop app launches and shows workspace shell', async () => {
  const app = await electron.launch({ args: ['.'] })
  const window = await app.firstWindow()

  await expect(window.getByText('ZKube')).toBeVisible()

  await app.close()
})
