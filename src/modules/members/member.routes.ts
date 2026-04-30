import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { MembersController } from './member.controller';
import {
  validateRequest,
  createMemberSchema,
  deleteMemberSchema,
} from './validators/member.validation';

const membersRoute = express.Router();

const membersController = new MembersController();

membersRoute.post(
  '/',
  authHandler.userAccess,
  validateRequest(createMemberSchema, 'body'),
  membersController.createMember
);

membersRoute.get('/', authHandler.userAccess, membersController.listMembers);

membersRoute.delete(
  '/:id',
  authHandler.userAccess,
  validateRequest(deleteMemberSchema, 'params'),
  membersController.deleteMember
);

export { membersRoute };
