import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { GoalController } from './goal.controller';

const goalsRoute = express.Router();

const goalController = new GoalController();

goalsRoute.post('/create', authHandler.userAccess, goalController.create);

goalsRoute.put('/:goalId', authHandler.userAccess, goalController.update);

goalsRoute.get('/list', authHandler.userAccess, goalController.list);

goalsRoute.get('/:goalId', authHandler.userAccess, goalController.getById);

goalsRoute.delete('/:goalId', authHandler.userAccess, goalController.delete);

goalsRoute.post('/:goalId/contribute', authHandler.userAccess, goalController.contribute);

goalsRoute.put('/:goalId/cancel', authHandler.userAccess, goalController.cancel);

export { goalsRoute };
