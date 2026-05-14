import type {
  FontSize,
  Language,
  Theme,
} from '../../../shared/models/preferences'
import { useI18n } from '../../use-i18n'
import { useThemeStore } from './useThemeStore'

type OptionGroupProps<TValue extends string> = {
  ariaLabel: string
  name: string
  options: Array<{ label: string; value: TValue }>
  selectedValue: TValue
  onChange: (value: TValue) => void
}

function OptionGroup<TValue extends string>({
  ariaLabel,
  name,
  options,
  selectedValue,
  onChange,
}: OptionGroupProps<TValue>) {
  return (
    <div className="theme-toggle" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <label key={option.value} className="theme-toggle__option">
          <input
            checked={selectedValue === option.value}
            name={name}
            type="radio"
            onChange={() => void onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}

export function SettingsWindow() {
  const {
    theme,
    fontSize,
    language,
    setTheme,
    setFontSize,
    setLanguage,
  } = useThemeStore()
  const { t } = useI18n()

  return (
    <main className="settings-shell settings-shell--scroll">
      <section className="panel settings-panel" aria-label="Settings panel">
        <div className="panel__header">
          <div>
            <div className="panel__eyebrow">{t('settings.settings')}</div>
            <h1 className="panel__title">{t('settings.appearance')}</h1>
          </div>
        </div>
        <div className="panel__body panel__body--scroll settings-panel__body settings-panel__body--scroll">
          <div className="settings-section">
            <div>
              <h2>{t('settings.theme')}</h2>
              <p className="muted">{t('settings.themeDescription')}</p>
            </div>
            <OptionGroup<Theme>
              ariaLabel={t('settings.theme')}
              name="theme"
              options={[
                { label: t('settings.dark'), value: 'dark' },
                { label: t('settings.light'), value: 'light' },
              ]}
              selectedValue={theme}
              onChange={setTheme}
            />
          </div>

          <div className="settings-section">
            <div>
              <h2>{t('settings.fontSize')}</h2>
              <p className="muted">{t('settings.fontSizeDescription')}</p>
            </div>
            <OptionGroup<FontSize>
              ariaLabel={t('settings.fontSize')}
              name="font-size"
              options={[
                { label: t('settings.small'), value: 'small' },
                { label: t('settings.medium'), value: 'medium' },
                { label: t('settings.large'), value: 'large' },
              ]}
              selectedValue={fontSize}
              onChange={setFontSize}
            />
          </div>

          <div className="settings-section">
            <div>
              <h2>{t('settings.language')}</h2>
              <p className="muted">{t('settings.languageDescription')}</p>
            </div>
            <OptionGroup<Language>
              ariaLabel={t('settings.language')}
              name="language"
              options={[
                { label: t('settings.english'), value: 'en' },
                { label: t('settings.chinese'), value: 'zh-CN' },
              ]}
              selectedValue={language}
              onChange={setLanguage}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
