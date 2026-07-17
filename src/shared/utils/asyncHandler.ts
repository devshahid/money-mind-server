import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction,
  session: mongoose.mongo.ClientSession
) => Promise<unknown>;

export default (requestHandler: AsyncFunction) =>
  async (req: Request, res: Response, next: NextFunction) => {
    // Ensure connection is ready before starting a session
    if (mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connection.asPromise();
      } catch (err) {
        console.error('[ERROR]: MongoDB connection not ready:', err);
        return next(new Error('Database connection unavailable'));
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    return Promise.resolve(requestHandler(req, res, next, session))
      .then(() => {
        return session.commitTransaction();
      })
      .catch(async (err) => {
        await session.abortTransaction();
        console.error('[ERROR]: AsyncHandler Error: ', err);
        return next(err);
      })
      .finally(() => {
        session.endSession();
      });
  };
