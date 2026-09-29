import { createTheme } from '@mui/material/styles'

// 对齐 super-productivity 默认色板（work-context.const.ts / global-theme.service.ts）
const SP_PRIMARY = '#6495ED'
const SP_ACCENT = '#ff4081'
const SP_WARN = '#e11826'
const SP_SURFACE_LIGHT = '#f8f8f7'
const SP_SURFACE_DARK = '#131314'

const UI_FONT_FAMILY = [
  '-apple-system',
  'BlinkMacSystemFont',
  'SF Pro Text',
  'SF Pro Display',
  'Helvetica Neue',
  'PingFang SC',
  'Hiragino Sans GB',
  'Microsoft YaHei',
  'sans-serif',
].join(',')

export const muiTheme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-theme' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: SP_PRIMARY },
        secondary: { main: SP_ACCENT },
        error: { main: SP_WARN },
        success: { main: '#248a3d' },
        warning: { main: '#b25000' },
        background: { default: SP_SURFACE_LIGHT, paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: SP_PRIMARY },
        secondary: { main: SP_ACCENT },
        error: { main: SP_WARN },
        success: { main: '#30d158' },
        warning: { main: '#ff9f0a' },
        background: { default: SP_SURFACE_DARK, paper: '#1d1d1f' },
      },
    },
  },
  typography: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 14,
  },
})
