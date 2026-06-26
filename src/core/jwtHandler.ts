import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthError, CustomError } from '../core/ApiError';
import { Types } from 'mongoose';

export interface JWT {
  email?: string;
  userId?: Types.ObjectId;
  userType: string;
}

interface IPayload {
  userType?: 'ADMIN' | 'USER';
  email: string;
  userId: Types.ObjectId;
}
class JWTHandler {
  createJwtToken = (data: IPayload, options: SignOptions = { expiresIn: '365d' }) => {
    try {
      if (!process.env.JWT_SECRET_KEY) throw new CustomError('JWT Key not configured');
      return jwt.sign(data, process.env.JWT_SECRET_KEY, options);
    } catch (error) {
      console.error('############### Error: createJwtToken ###############', JSON.stringify(error));
      throw new CustomError('Error: createJwtToken', 500);
    }
  };

  verifyToken = (accessToken: string): JWT => {
    try {
      if (!process.env.JWT_SECRET_KEY) throw new CustomError('JWT Key not configured');
      return jwt.verify(accessToken, process.env.JWT_SECRET_KEY) as JWT;
    } catch (error) {
      console.error('########## Error: JWT.verify ###########', JSON.stringify(error));
      throw new AuthError('Error: accesstoken mismatch', 404);
    }
  };
}
export default new JWTHandler();
