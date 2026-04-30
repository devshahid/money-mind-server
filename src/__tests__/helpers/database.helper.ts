/**
 * Database Test Helper
 * Manages MongoDB Memory Server for isolated testing
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

/**
 * Connect to in-memory MongoDB instance
 */
export const connectTestDatabase = async (): Promise<void> => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);

    console.log('✅ Connected to MongoDB Memory Server');
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
