import express from 'express';
import authHandler from '../../shared/middlewares/auth/authHandler';
import { MembersController } from './member.controller';

const membersRoute = express.Router();

const membersController = new MembersController();

membersRoute.post('/create', authHandler.userAccess, membersController.createMember);

membersRoute.get('/list', authHandler.userAccess, membersController.listMembers);

membersRoute.delete('/delete/:id', authHandler.userAccess, membersController.deleteMember);

export { membersRoute };
