const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

const config = getDefaultConfig(__dirname)

const nativeOnlyPackages = [
  '@op-engineering/op-sqlite',
  '@powersync/op-sqlite',
  '@powersync/react-native',
  'react-native-mmkv',
  '@expo/ui/swift-ui',
  'expo-symbols'
]

const previousResolver = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    nativeOnlyPackages.some(pkg => moduleName.startsWith(pkg))
  )
    return { type: 'empty' }

  if (previousResolver) return previousResolver(context, moduleName, platform)
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css'
})
