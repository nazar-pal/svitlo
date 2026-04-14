import {
  Host,
  Picker,
  Menu as SwiftMenu,
  Text as SwiftText
} from '@expo/ui/swift-ui'
import { labelStyle, tag } from '@expo/ui/swift-ui/modifiers'

import { type LocaleChoice, useTranslation } from '@/lib/i18n'

const CHOICE_LABELS = {
  en: 'EN',
  uk: 'UK',
  auto: 'Auto'
} as const

export function LanguageMenu() {
  const { choice, setLocaleChoice, t } = useTranslation()

  return (
    <Host matchContents>
      <SwiftMenu
        label={CHOICE_LABELS[choice]}
        systemImage="globe"
        modifiers={[labelStyle('iconOnly')]}
      >
        <Picker<LocaleChoice>
          selection={choice}
          onSelectionChange={setLocaleChoice}
        >
          {[
            ['uk', 'Українська'],
            ['en', 'English'],
            ['auto', t('drawer.deviceLanguage')]
          ].map(([value, label]) => (
            <SwiftText key={value} modifiers={[tag(value as LocaleChoice)]}>
              {label}
            </SwiftText>
          ))}
        </Picker>
      </SwiftMenu>
    </Host>
  )
}
