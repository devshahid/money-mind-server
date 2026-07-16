import mongoose from 'mongoose';

const connectDb = async () => {
  try {
    const DB_URI = `${process.env.DB_URL}/${process.env.DB_NAME}`;
    const dbInstance = await mongoose.connect(DB_URI);
    console.info('DATABASE CONNECTED!!');
    console.info(`DB HOSTNAME: ${dbInstance.connection.host}`);
  } catch (error) {
    console.error(`MONGODB CONNECTION FAILED : ${error}`);
    // In Lambda, throw error instead of process.exit
    throw error;
  }
};

export default connectDb;
