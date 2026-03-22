/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo/ios',
  moduleNameMapper: {
    '^@/env$': '<rootDir>/env.ts',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*-test.ts?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|i18next|react-i18next|zod|date-fns|drizzle-orm|@orpc|@powersync)'
  ]
}

module.exports = config
