import { CustomError } from '../../shared/core/ApiError';
import asyncHandler from '../../shared/utils/asyncHandler';
import ResponseHandler from '../../shared/utils/responseHandler';
import { CustomRequest } from '../../shared/middlewares/auth/authHandler';
import { MembersService } from './member.service';
import { Response } from 'express';

class MembersController extends ResponseHandler {
  createMember = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const { name } = req.body;
    const service = new MembersService(req.user._id);
    const response = await service.createMember(name);
    await this.sendResponse(response, res);
  });

  listMembers = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new MembersService(req.user._id);
    const response = await service.listMembers();
    await this.sendResponse(response, res);
  });

  deleteMember = asyncHandler(async (req: CustomRequest, res: Response) => {
    const id = req.params.id as string;
    if (!req.user?._id) throw new CustomError('Please login first!!');
    const service = new MembersService(req.user._id);
    const response = await service.deleteMember(id);
    await this.sendResponse(response, res);
  });
}

export { MembersController };
