/** @type {import('jest').Config} */
const shared = {
  moduleNameMapper: {
    '^@/env$': '<rootDir>/env.ts',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}

module.exports = {
  projects: [
    {
      ...shared,
      displayName: 'unit',
      preset: 'jest-expo/ios',
      setupFiles: ['<rootDir>/jest.setup.js'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup-after-env.js'],
      testMatch: ['**/__tests__/**/*-test.ts?(x)', '!**/*-integration-test.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|i18next|react-i18next|zod|date-fns|drizzle-orm|@orpc|@powersync)'
      ]
    },
    {
      ...shared,
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/**/*-integration-test.ts'],
      transform: {
        '^.+\\.tsx?$': ['babel-jest', { presets: ['@babel/preset-typescript'] }]
      }
    }
  ]
}
