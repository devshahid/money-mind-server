/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  roots: ['<rootDir>/src'],
  testRegex: '.*(?<!\\.intg)\\.spec\\.ts$', // only unit tests (ignore integration tests)
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/tests/**'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 10000, // 10s
};
