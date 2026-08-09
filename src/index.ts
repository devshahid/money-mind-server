/* Importing dotenv for environment variables */
import dotenv from 'dotenv';
dotenv.config({
  path: './.env',
  override: true,
});

/* Importing Database connection function */
import connectDb from './db/index';

/* Importing main express application */
import app from './app';

import { CategorizationJob } from './modules/ai/models/categorization-job.model';

const port = process.env.PORT || 8000;
async function initializeApp() {
  try {
    /* Connecting Database */
    if (process.env.ENVIRONMENT === 'dev' && process.env.SERVER === 'local') {
      await connectDb();
    }

    /* Clean up orphaned AI jobs from previous server session */
    const orphaned = await CategorizationJob.updateMany(
      { status: { $in: ['pending', 'processing'] } },
      { status: 'failed', error: 'Server restarted — job was interrupted', completedAt: new Date() }
    );
    if (orphaned.modifiedCount > 0) {
      console.info(`🧹 Cleaned up ${orphaned.modifiedCount} orphaned categorization job(s)`);
    }

    /* Starting app on env port when database connected successfully */
    app.listen(port, () => {
      console.info(`server running on port : ${port}`);
      console.info(`Environment : ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('An error occurred during initialization:', error);
  }
}

initializeApp();
