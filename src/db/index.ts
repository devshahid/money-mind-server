import mongoose from 'mongoose';

const connectDb = async () => {
  try {
    const DB_URI = `${process.env.DB_URL}/${process.env.DB_NAME}`;
    const dbInstance = await mongoose.connect(DB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.info('DATABASE CONNECTED!!');
    console.info(`DB HOSTNAME: ${dbInstance.connection.host}`);
  } catch (error) {
    console.error(`MONGODB CONNECTION FAILED : ${error}`);
    throw error;
  }
};

export default connectDb;
