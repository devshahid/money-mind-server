/* eslint-disable @typescript-eslint/no-require-imports */
const jestConfig = require('./jest.config.js');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...jestConfig,
  testRegex: '.*\\.intg\\.spec\\.ts$', // only integration tests (ignore unit tests)
  // Integration tests require on average more time to run than unit tests because
  // they often wait for the responses of external services
  testTimeout: 20000, // 20s
  maxWorkers: 1,
};
