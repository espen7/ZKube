import './styles/tokens.css'
import './styles/app.css'

import { AppShell } from './features/layout/AppShell'
import { SettingsWindow } from './features/settings/SettingsWindow'
import { useThemeStore } from './features/settings/useThemeStore'

function getWindowMode() {
  const params = new URLSearchParams(window.location.search)
  return params.get('window') === 'settings' ? 'settings' : 'main'
}

export default function App() {
  useThemeStore()

  return getWindowMode() === 'settings' ? <SettingsWindow /> : <AppShell />
}
