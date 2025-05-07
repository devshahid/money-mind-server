/* Importing dotenv for environment variables */
import dotenv from 'dotenv';
dotenv.config({
  path: './.env',
});

/* Importing Database connection function */
import connectDb from './db/index';

/* Importing main express application */
import app from './app';

const port = process.env.PORT || 8000;
async function initializeApp() {
  try {
    /* Connecting Database */
    if (process.env.ENVIRONMENT === 'dev' && process.env.SERVER === 'local') {
      await connectDb();
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
