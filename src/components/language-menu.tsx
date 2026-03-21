import {
  Host,
  Button as SwiftButton,
  Divider as SwiftDivider,
  Menu as SwiftMenu
} from '@expo/ui/swift-ui'

import { useTranslation } from '@/lib/i18n'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'

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
        <SwiftButton
          label="Українська"
          systemImage={choice === 'uk' ? 'checkmark' : undefined}
          onPress={() => setLocaleChoice('uk')}
        />
        <SwiftButton
          label="English"
          systemImage={choice === 'en' ? 'checkmark' : undefined}
          onPress={() => setLocaleChoice('en')}
        />
        <SwiftDivider />
        <SwiftButton
          label={t('drawer.deviceLanguage')}
          systemImage={choice === 'auto' ? 'checkmark' : undefined}
          onPress={() => setLocaleChoice('auto')}
        />
      </SwiftMenu>
    </Host>
  )
}
