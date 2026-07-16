import serverless from 'serverless-http';
import app from './app';
import connectDb from './db/index';

// Cache the DB connection promise to avoid reconnecting on warm invocations
let dbConnectionPromise: Promise<void> | null = null;

function ensureDbConnected(): Promise<void> {
  if (!dbConnectionPromise) {
    dbConnectionPromise = connectDb().catch((err) => {
      // Reset so next invocation retries
      dbConnectionPromise = null;
      throw err;
    });
  }
  return dbConnectionPromise;
}

// Start connecting immediately on cold start (don't await here — warm it up)
if (process.env.ENVIRONMENT === 'prod' && process.env.SERVER === 'deploy') {
  ensureDbConnected();
}

const handler = serverless(app);

export const debtmanagementapi: typeof handler = async (event, context) => {
  // Ensure DB is connected before handling any request
  await ensureDbConnected();
  return handler(event, context);
};
