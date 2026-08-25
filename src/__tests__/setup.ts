/**
 * Jest Setup - Global Test Configuration
 *
 * This file runs before all tests
 */

/// <reference types="jest" />

/* eslint-disable no-undef */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET_KEY = 'test-jwt-secret-key-for-testing';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'; // Will be overridden by MongoDB Memory Server
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'test-github-token';
process.env.GITHUB_MODEL = process.env.GITHUB_MODEL || 'gpt-4o-mini';
process.env.DB_URL = process.env.DB_URL || 'mongodb://localhost:27017';
process.env.DB_NAME = process.env.DB_NAME || 'test';

// Increase timeout for slower systems.
// Integration tests spin up an in-memory MongoDB replica set in a beforeAll
// hook; on a cold cache (e.g. a fresh CI runner) the mongod binary is
// downloaded first, which can take well over the old 15s. Give hooks enough
// headroom so a first-run download does not flake the suite.
jest.setTimeout(60000);

// Mock console methods to reduce test output noise (optional)
// Uncomment if you want cleaner test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
