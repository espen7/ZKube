import { translate } from './i18n'
import { useThemeStore } from './features/settings/useThemeStore'

export function useI18n() {
  const { language } = useThemeStore()

  return {
    language,
    t: (
      key: string,
      variables?: Record<string, string | number>,
    ): string => translate(language, key, variables),
  }
}
