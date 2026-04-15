import { type LocaleChoice, useTranslation } from '@/lib/i18n'
import {
  Host,
  Picker,
  Menu as SwiftMenu,
  Text as SwiftText
} from '@expo/ui/swift-ui'
import { labelStyle, tag } from '@expo/ui/swift-ui/modifiers'

const TRIGGER_LABELS: Record<LocaleChoice, string> = {
  en: 'EN',
  uk: 'UK',
  auto: 'Auto'
}

export function LanguageMenu() {
  const { choice, setLocaleChoice, t } = useTranslation()

  const options: { value: LocaleChoice; label: string }[] = [
    { value: 'uk', label: 'Українська' },
    { value: 'en', label: 'English' },
    { value: 'auto', label: t('drawer.deviceLanguage') }
  ]

  return (
    <Host matchContents>
      <SwiftMenu
        label={TRIGGER_LABELS[choice]}
        systemImage="globe"
        modifiers={[labelStyle('iconOnly')]}
      >
        <Picker<LocaleChoice>
          selection={choice}
          onSelectionChange={setLocaleChoice}
        >
          {options.map(({ value, label }) => (
            <SwiftText key={value} modifiers={[tag(value)]}>
              {label}
            </SwiftText>
          ))}
        </Picker>
      </SwiftMenu>
    </Host>
  )
}
