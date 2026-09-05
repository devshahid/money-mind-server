import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { AIConfigController } from './ai-config.controller';
import { validateRequest } from './validators';
import { upsertAIConfigSchema } from './validators/ai-config.validation';

const aiConfigRoute = express.Router();

const aiConfigController = new AIConfigController();

aiConfigRoute.get('/config', authHandler.userAccess, aiConfigController.getConfig);

aiConfigRoute.put(
  '/config',
  authHandler.userAccess,
  validateRequest(upsertAIConfigSchema),
  aiConfigController.upsertConfig
);

aiConfigRoute.delete('/config', authHandler.userAccess, aiConfigController.deleteConfig);

export { aiConfigRoute };
