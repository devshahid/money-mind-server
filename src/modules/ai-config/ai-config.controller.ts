import asyncHandler from '../../shared/utils/asyncHandler';
import ResponseHandler from '../../shared/utils/responseHandler';
import { CustomRequest } from '../../shared/middlewares/auth/authHandler';
import { Response } from 'express';
import { CustomError } from '../../shared/core/ApiError';
import { AIConfigService } from './ai-config.service';

class AIConfigController extends ResponseHandler {
  getConfig = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const aiConfigService = new AIConfigService();
    const response = await aiConfigService.getConfig(req.user._id);
    await this.sendResponse(response, res);
  });

  upsertConfig = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const { model, apiKey } = req.body;
    const aiConfigService = new AIConfigService();
    const response = await aiConfigService.upsertConfig(req.user._id, model, apiKey);
    await this.sendResponse(response, res);
  });

  deleteConfig = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const aiConfigService = new AIConfigService();
    await aiConfigService.deleteConfig(req.user._id);
    await this.sendResponse({ configured: false }, res);
  });

  testConnection = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');

    const { model, apiKey } = req.body;
    const aiConfigService = new AIConfigService();
    const response = await aiConfigService.testConnection(model, apiKey);
    await this.sendResponse(response, res);
  });
}

export { AIConfigController };
