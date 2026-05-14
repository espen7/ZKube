import { useEffect, useSyncExternalStore } from 'react'

import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LANGUAGE,
  fontSizeValues,
  type FontSize,
  type Language,
  type Preferences,
  type Theme,
} from '../../../shared/models/preferences'

type PreferencesState = Preferences

const listeners = new Set<() => void>()

let unsubscribeTheme: (() => void) | null = null
let initialized = false
let state: PreferencesState = getDefaultPreferences()

function getBrowserTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

function getDefaultPreferences(): PreferencesState {
  return {
    theme: getBrowserTheme(),
    language: DEFAULT_LANGUAGE,
    fontSize: DEFAULT_FONT_SIZE,
  }
}

function normalizePreferences(input?: Partial<Preferences>): PreferencesState {
  const defaults = getDefaultPreferences()

  return {
    theme: input?.theme ?? defaults.theme,
    language: input?.language ?? defaults.language,
    fontSize: input?.fontSize ?? defaults.fontSize,
  }
}

function applyPreferencesToDocument(preferences: PreferencesState) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = preferences.theme
  document.documentElement.dataset.language = preferences.language
  document.documentElement.dataset.fontSize = preferences.fontSize
  document.documentElement.style.colorScheme = preferences.theme
  document.documentElement.lang = preferences.language
}

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

function setState(next: PreferencesState) {
  state = next
  applyPreferencesToDocument(next)
  emitChange()
}

async function loadPreferences() {
  if (!window.zkube?.preferences?.getTheme) {
    setState(getDefaultPreferences())
    return
  }

  const result = await window.zkube.preferences.getTheme()
  setState(normalizePreferences(result))
}

function ensureInitialized() {
  if (initialized) {
    return
  }

  initialized = true
  void loadPreferences()

  if (window.zkube?.preferences?.subscribeTheme) {
    unsubscribeTheme = window.zkube.preferences.subscribeTheme((preferences) => {
      setState(normalizePreferences(preferences))
    })
  }
}

async function persistPreferences(update: Theme | Partial<Preferences>) {
  const next =
    typeof update === 'string'
      ? { ...state, theme: update }
      : normalizePreferences({ ...state, ...update })

  setState(next)

  if (!window.zkube?.preferences?.setTheme) {
    return
  }

  await window.zkube.preferences.setTheme(
    typeof update === 'string' ? update : update,
  )
}

async function setTheme(theme: Theme) {
  await persistPreferences(theme)
}

async function setLanguage(language: Language) {
  await persistPreferences({ language })
}

async function setFontSize(fontSize: FontSize) {
  await persistPreferences({ fontSize })
}

export function getPreferencesSnapshot() {
  return state
}

export function resetThemeStore() {
  unsubscribeTheme?.()
  unsubscribeTheme = null
  initialized = false
  state = getDefaultPreferences()
  applyPreferencesToDocument(state)
  emitChange()
}

export function useThemeStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    ensureInitialized()

    return () => {
      if (listeners.size === 1) {
        unsubscribeTheme?.()
        unsubscribeTheme = null
        initialized = false
      }
    }
  }, [])

  useEffect(() => {
    applyPreferencesToDocument(snapshot)
  }, [snapshot])

  return {
    ...snapshot,
    fontSizePx: fontSizeValues[snapshot.fontSize],
    setTheme,
    setLanguage,
    setFontSize,
  }
}

export const usePreferencesStore = useThemeStore
