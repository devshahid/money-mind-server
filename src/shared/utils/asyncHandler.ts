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
    const session = await mongoose.startSession(); // Start a session
    session.startTransaction(); // Start the transaction

    return Promise.resolve(requestHandler(req, res, next, session))
      .then(() => {
        return session.commitTransaction(); // Commit the transaction if successful
      })
      .catch(async (err) => {
        await session.abortTransaction(); // Abort the transaction in case of an error
        console.log('AsyncHandler Error: ', err);
        return next(err); // Pass the error to the next middleware
      })
      .finally(() => {
        session.endSession(); // End the session
      });
  };
