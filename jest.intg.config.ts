import type { Config } from 'jest';

/**
 * Jest Configuration - Integration Tests
 * Matches: *.intg.spec.ts
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.intg\\.spec\\.ts$', // only integration tests (ignore unit tests)
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
  coverageDirectory: './coverage-integration',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Integration tests require more time as they may wait for database operations
  testTimeout: 20000, // 20s
  // Run tests sequentially to avoid database conflicts
  maxWorkers: 1,
  verbose: true,
};

export default config;
