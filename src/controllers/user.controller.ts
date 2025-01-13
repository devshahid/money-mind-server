import { Request, Response } from 'express';
import asyncHandler from '../helpers/asyncHandler';
import ResponseHandler from '../helpers/responseHandler';
import { UserService } from '../services/user.service';
import { CustomError } from '@core/ApiError';

class UserController extends ResponseHandler {
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, role = 'USER' } = req.body;

    const userService = new UserService();
    const response = await userService.registerService(email, password, role);

    await this.sendResponse(response, res, 'User created successfully');
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, role = 'USER' } = req.body;

    const userService = new UserService();
    const response = await userService.loginService(email, password, role);
    await this.sendResponse(response, res);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const accessToken = req.get('accessToken');
    if (!accessToken) throw new CustomError('Access Token Required');

    const userService = new UserService();
    const response = await userService.logoutService(accessToken);
    await this.sendResponse(response, res);
  });
}

export { UserController };
