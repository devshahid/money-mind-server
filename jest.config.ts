import type { Config } from 'jest';

/**
 * Jest Configuration - Unit Tests
 * Matches: *.spec.ts (excludes *.intg.spec.ts)
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*(?<!\\.intg)\\.spec\\.ts$', // only unit tests (ignore integration tests)
  testMatch: undefined, // Use testRegex instead
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.intg.spec.ts',
    '!src/__tests__/**',
    '!src/tests/**',
    '!src/index.ts',
    '!src/handler.ts',
  ],
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  testTimeout: 10000, // 10s
  verbose: true,
};

export default config;
