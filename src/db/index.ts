import mongoose from 'mongoose';

const connectDb = async () => {
  try {
    const DB_URI = `${process.env.DB_URL}/${process.env.DB_NAME}`;
    const dbInstance = await mongoose.connect(DB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Never build indexes at runtime in production. On a serverless/Lambda
      // deployment autoIndex would attempt a createIndex on every cold start;
      // a unique index that cannot build (e.g. the LedgerEntry
      // { ledgerId, transactionId } index when legacy duplicate pairs still
      // exist) then stalls requests until the gateway times out. Indexes are
      // managed via migrations/deploy instead. Left on outside production for
      // developer convenience.
      autoIndex: process.env.NODE_ENV !== 'production',
    });
    console.info('DATABASE CONNECTED!!');
    console.info(`DB HOSTNAME: ${dbInstance.connection.host}`);
  } catch (error) {
    console.error(`MONGODB CONNECTION FAILED : ${error}`);
    throw error;
  }
};

export default connectDb;
