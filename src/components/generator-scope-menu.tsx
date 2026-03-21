import {
  Host,
  Button as SwiftButton,
  Divider as SwiftDivider,
  Menu as SwiftMenu
} from '@expo/ui/swift-ui'
import { labelStyle } from '@expo/ui/swift-ui/modifiers'

import type { Generator } from '@/data/client/db-schema'

interface GeneratorScopeMenuProps {
  admin: boolean
  availableGenerators: Generator[]
  effectiveScope: string
  onSelect: (scope: string) => void
}

export function GeneratorScopeMenu({
  admin,
  availableGenerators,
  effectiveScope,
  onSelect
}: GeneratorScopeMenuProps) {
  if (availableGenerators.length <= 1) return null

  const isFiltered = effectiveScope !== (admin ? 'org' : 'my')

  const scopeIcon = !isFiltered
    ? 'line.3.horizontal.decrease'
    : effectiveScope === 'my'
      ? 'person'
      : 'bolt.fill'

  return (
    <Host matchContents>
      <SwiftMenu
        label="Filter"
        systemImage={scopeIcon}
        modifiers={[labelStyle('iconOnly')]}
      >
        {admin ? (
          <SwiftButton
            label="Organization"
            systemImage={effectiveScope === 'org' ? 'checkmark' : undefined}
            onPress={() => onSelect('org')}
          />
        ) : null}
        <SwiftButton
          label="My Generators"
          systemImage={effectiveScope === 'my' ? 'checkmark' : undefined}
          onPress={() => onSelect('my')}
        />
        <SwiftDivider />
        <SwiftMenu label="Generator">
          {availableGenerators.map(g => (
            <SwiftButton
              key={g.id}
              label={g.title}
              systemImage={effectiveScope === g.id ? 'checkmark' : undefined}
              onPress={() => onSelect(g.id)}
            />
          ))}
        </SwiftMenu>
      </SwiftMenu>
    </Host>
  )
}
