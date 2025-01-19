import { NextFunction, Request, Response } from 'express';
import asyncHandler from '@helpers/asyncHandler';
import { AuthError, CustomError } from '@core/ApiError';
import { ERROR } from '@constant/index';
import jwtHandler, { JWT } from '@core/jwtHandler';
import { IUserModel, User } from '@models/user.model';
import { UserLogin } from '@models/user-logins.model';

export interface CustomRequest extends Request {
  user?: IUserModel;
  verifyToken?: JWT;
}

class AuthHandler {
  private validateUser = async (accessToken: string, verifyToken: JWT) => {
    const userData = await UserLogin.findOne({
      accessToken,
      email: verifyToken.email,
    });
    if (!userData) throw new AuthError(ERROR.LOGIN_FIRST);

    //Check if accessToken belongs current user or not:
    if (verifyToken.email != userData.email) throw new AuthError(ERROR.ACCESSTOKEN_MISMATCH);

    //If token verified correctly then go ahead:
    const user = await User.findOne(
      { email: userData.email, role: verifyToken.userType },
      { password: 0 }
    );
    if (!user) throw new CustomError('User not exist');

    return user;
  };

  private checkValidations = async (
    userType: 'ADMIN' | 'USER',
    req: CustomRequest,
    res: Response,
    next: NextFunction
  ) => {
    const accessToken = req.get('accessToken');
    if (!accessToken) throw new AuthError(ERROR.PROVIDE_ACCESSTOKEN);

    const verifyToken = jwtHandler.verifyToken(accessToken);

    if (!userType.includes(verifyToken.userType)) throw new AuthError(ERROR.UNAUTHORIZED_ACCESS);

    req.user = await this.validateUser(accessToken, verifyToken);
    next();
  };

  adminAccess = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
    await this.checkValidations('ADMIN', req, res, next);
  });

  userAccess = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
    await this.checkValidations('USER', req, res, next);
  });
}

export default new AuthHandler();
