import express from 'express';
import { UserController } from './user.controller';
import authHandler from '../../shared/middlewares/auth/authHandler';

const userRoute = express.Router();

const userController = new UserController();

userRoute.post('/register', userController.register);

userRoute.post('/login', userController.login);

userRoute.post('/logout', authHandler.userAccess, userController.logout);

export { userRoute };
