import serverless from 'serverless-http';
import app from './app';
import connectDb from './db/index';

async function initializeDatabase() {
  await connectDb();
}

if (process.env.ENVIRONMENT === 'prod' && process.env.SERVER === 'deploy') {
  initializeDatabase();
}

export const debtmanagementapi = serverless(app);
