import express from 'express';
import { userRoute } from './user.route';
import { expenseRoute } from './expense.route';
const router = express.Router();

router.use('/user', userRoute);

router.use('/expense', expenseRoute);

export default router;
