import express from 'express';
import { UserController } from './user.controller';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { validateRequest, registerSchema, loginSchema } from './validators/user.validation';

const userRoute = express.Router();

const userController = new UserController();

userRoute.post('/register', validateRequest(registerSchema, 'body'), userController.register);

userRoute.post('/login', validateRequest(loginSchema, 'body'), userController.login);

userRoute.post('/logout', authHandler.userAccess, userController.logout);

export { userRoute };
