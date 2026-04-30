/**
 * Jest Setup - Global Test Configuration
 *
 * This file runs before all tests
 */

/// <reference types="jest" />

/* eslint-disable no-undef */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'; // Will be overridden by MongoDB Memory Server

// Increase timeout for slower systems
jest.setTimeout(15000);

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
