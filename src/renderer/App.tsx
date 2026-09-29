import './styles/tokens.css'
import './styles/app.css'
import '@material-symbols/font-400/rounded.css'

import { ThemeProvider } from '@mui/material/styles'

import { AppShell } from './features/layout/AppShell'
import { SettingsWindow } from './features/settings/SettingsWindow'
import { useThemeStore } from './features/settings/useThemeStore'
import { muiTheme } from './theme/mui-theme'

function getWindowMode() {
  const params = new URLSearchParams(window.location.search)
  return params.get('window') === 'settings' ? 'settings' : 'main'
}

export default function App() {
  useThemeStore()

  return (
    <ThemeProvider theme={muiTheme}>
      {getWindowMode() === 'settings' ? <SettingsWindow /> : <AppShell />}
    </ThemeProvider>
  )
}
