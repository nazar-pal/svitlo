// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*']
  },
  {
    files: ['src/screens/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/screens/*/**'],
              message:
                'Screen folders are isolated. Move shared code to src/lib/, src/components/, or src/data/.'
            }
          ]
        }
      ]
    }
  }
])
