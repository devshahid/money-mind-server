import express from 'express';
import { UserController } from '../controllers/user.controller';
import authHandler from '../middlewares/auth/authHandler';

const userRoute = express.Router();

const userController = new UserController();

userRoute.post('/register', userController.register);

userRoute.post('/login', userController.login);

userRoute.post('/logout', authHandler.userAccess, userController.logout);

export { userRoute };
