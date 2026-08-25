/**
 * Database Test Helper
 * Manages MongoDB Memory Server for isolated testing
 */

import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let mongoServer: MongoMemoryReplSet | null = null;

/**
 * Refuse to run any test-database operation in production.
 *
 * These helpers spin up a throwaway in-memory MongoDB and truncate/drop
 * collections. They must never execute against a real deployment. This guard
 * makes that structurally impossible: if `NODE_ENV` is 'production' the helper
 * throws before it can connect or delete anything, regardless of how it was
 * invoked or what DB_URL happens to be set in the environment.
 */
const assertNotProduction = (operation: string): void => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Refusing to run test database helper "${operation}" with NODE_ENV=production. ` +
        'These helpers truncate/drop collections and must only run against the in-memory test database.'
    );
  }
};

/**
 * Connect to an in-memory MongoDB instance.
 *
 * Uses a single-node REPLICA SET (not a standalone server). Every request in
 * the app is wrapped by `asyncHandler`, which opens a multi-document
 * transaction (startSession/startTransaction/commitTransaction). MongoDB only
 * supports transactions on a replica set or mongos — a standalone `mongod`
 * rejects them. Running integration tests against a standalone memory server
 * therefore never exercised the transactional path, which is how a
 * transaction-dependent production bug shipped green. A single-node replica set
 * is transaction-capable, runs fully in-process, and costs nothing.
 */
export const connectTestDatabase = async (): Promise<void> => {
  assertNotProduction('connectTestDatabase');
  try {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);

    console.log('✅ Connected to MongoDB Memory Server (replica set)');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB Memory Server:', error);
    throw error;
  }
};

/**
 * Disconnect and stop in-memory MongoDB instance
 */
export const disconnectTestDatabase = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
    }

    console.log('✅ Disconnected from MongoDB Memory Server');
  } catch (error) {
    console.error('❌ Failed to disconnect from MongoDB Memory Server:', error);
    throw error;
  }
};

/**
 * Clear all collections in the test database
 */
export const clearDatabase = async (): Promise<void> => {
  assertNotProduction('clearDatabase');
  try {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    console.log('🧹 Database cleared');
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
    throw error;
  }
};

/**
 * Drop all collections in the test database
 */
export const dropDatabase = async (): Promise<void> => {
  assertNotProduction('dropDatabase');
  try {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.drop();
    }

    console.log('🗑️  Database dropped');
  } catch (error) {
    console.error('❌ Failed to drop database:', error);
    // Ignore "ns not found" errors when collection doesn't exist
    if (error instanceof Error && !error.message.includes('ns not found')) {
      throw error;
    }
  }
};

/**
 * Seed database with test data
 * @param seedData - Object containing arrays of documents to seed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const seedDatabase = async (seedData: { [modelName: string]: any[] }): Promise<void> => {
  try {
    for (const [modelName, documents] of Object.entries(seedData)) {
      const Model = mongoose.model(modelName);
      if (documents && documents.length > 0) {
        await Model.insertMany(documents);
      }
    }

    console.log('🌱 Database seeded');
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    throw error;
  }
};
