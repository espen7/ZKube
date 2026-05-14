export type Theme = 'dark' | 'light'

export type FontSize = 'small' | 'medium' | 'large'

export type Language = 'en' | 'zh-CN'

export type Preferences = {
  theme: Theme
  fontSize: FontSize
  language: Language
}

export const DEFAULT_LANGUAGE: Language = 'en'
export const DEFAULT_FONT_SIZE: FontSize = 'medium'

export const fontSizeValues: Record<FontSize, number> = {
  small: 13,
  medium: 14,
  large: 16,
}
