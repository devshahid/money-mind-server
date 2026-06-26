/// <reference types="jest" />

import request from 'supertest';
import { Express } from 'express';
import { Types } from 'mongoose';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearDatabase,
} from '../../../__tests__/helpers/database.helper';
import { User } from '../../users/models/user.model';
import { UserLogin } from '../../users/models/user-logins.model';
import { Debt } from '../models/debts.model';
import { DebtPayment } from '../models/debt-payment.model';
import jwtHandler from '../../../shared/core/jwtHandler';

describe('Debts API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let testUserId: Types.ObjectId;
  let testDebtId: Types.ObjectId;

  beforeAll(async () => {
    await connectTestDatabase();
    const appModule = await import('../../../app');
    app = appModule.default;
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create test user
    const testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: 'USER',
    });
    testUserId = testUser._id;

    // Generate auth token
    authToken = jwtHandler.createJwtToken({
      email: testUser.email,
      userId: testUser._id,
      userType: 'USER',
    });

    // Create UserLogin entry for auth validation
    await UserLogin.create({
      userId: testUser._id,
      email: testUser.email,
      accessToken: authToken,
    });

    // Create a test debt
    const testDebt = await Debt.create({
      userId: testUserId,
      debtDetails: {
        debtName: 'Test Home Loan',
        startDate: new Date('2024-01-01'),
        expectedEndDate: new Date('2044-01-01'),
        totalAmount: 5000000,
        remainingAmount: 4800000,
        interestRate: 8.5,
        debtStatus: 'ACTIVE',
        monthlyExpectedEMI: 40000,
        monthlyActualEMI: 40000,
        partPayment: 0,
        paymentDate: new Date('2024-01-05'),
        lender: 'HDFC Bank',
      },
    });
    testDebtId = testDebt._id;
  });

  describe('POST /api/v1/debt/add-debt', () => {
    it('should create a new debt successfully', async () => {
      const debtData = {
        debtDetails: {
          debtName: 'Car Loan',
          startDate: '2024-06-01',
          expectedEndDate: '2029-06-01',
          totalAmount: 800000,
          remainingAmount: 800000,
          interestRate: 9.5,
          debtStatus: 'ACTIVE',
          monthlyExpectedEMI: 15000,
          monthlyActualEMI: 15000,
          partPayment: 0,
          paymentDate: '2024-06-10',
          lender: 'ICICI Bank',
        },
      };

      const response = await request(app)
        .post('/api/v1/debt/add-debt')
        .set('accessToken', authToken)
        .send(debtData)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.statusCode).toBe(200);
      expect(response.body.output).toBeDefined();
      expect(response.body.output.debtName).toBe('Car Loan');
      expect(response.body.output.principal).toBe(800000);

      // Verify in database
      const debt = await Debt.findById(response.body.output._id);
      expect(debt).toBeDefined();
      expect(debt?.debtDetails.lender).toBe('ICICI Bank');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/debt/add-debt')
        .set('accessToken', authToken)
        .send({ debtDetails: { debtName: 'Incomplete Debt' } })
        .expect(400);

      expect(response.body.status).toBe(false);
    });

    it('should return 400 when interest rate exceeds 100%', async () => {
      const debtData = {
        debtDetails: {
          debtName: 'Invalid Loan',
          startDate: '2024-01-01',
          expectedEndDate: '2025-01-01',
          totalAmount: 100000,
          remainingAmount: 100000,
          interestRate: 150,
          debtStatus: 'ACTIVE',
          monthlyExpectedEMI: 10000,
          monthlyActualEMI: 10000,
          paymentDate: '2024-01-10',
        },
      };

      const response = await request(app)
        .post('/api/v1/debt/add-debt')
        .set('accessToken', authToken)
        .send(debtData)
        .expect(400);

      expect(response.body.status).toBe(false);
    });

    it('should return 401 when no auth token provided', async () => {
      const response = await request(app)
        .post('/api/v1/debt/add-debt')
        .send({ debtDetails: {} })
        .expect(401);

      expect(response.body.status).toBe(false);
    });
  });

  describe('PUT /api/v1/debt/update-debt', () => {
    it('should update debt successfully', async () => {
      const updateData = {
        debtId: testDebtId.toString(),
        debtDetails: {
          remainingAmount: 4500000,
          debtStatus: 'ACTIVE',
        },
      };

      const response = await request(app)
        .put('/api/v1/debt/update-debt')
        .set('accessToken', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output.remainingBalance).toBe(4500000);

      // Verify in database
      const debt = await Debt.findById(testDebtId);
      expect(debt?.debtDetails.remainingAmount).toBe(4500000);
    });

    it('should return 400 when debt not found', async () => {
      const fakeId = new Types.ObjectId();
      const response = await request(app)
        .put('/api/v1/debt/update-debt')
        .set('accessToken', authToken)
        .send({
          debtId: fakeId.toString(),
          debtDetails: { remainingAmount: 1000 },
        })
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message).toContain('Debt not exist');
    });

    it('should return 400 when debtId is invalid', async () => {
      const response = await request(app)
        .put('/api/v1/debt/update-debt')
        .set('accessToken', authToken)
        .send({
          debtId: 'invalid-id',
          debtDetails: { remainingAmount: 1000 },
        })
        .expect(400);

      expect(response.body.status).toBe(false);
    });
  });

  describe('GET /api/v1/debt/get-debt/:debtId', () => {
    it('should get debt by id', async () => {
      const response = await request(app)
        .get(`/api/v1/debt/get-debt/${testDebtId}`)
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output._id).toBe(testDebtId.toString());
      expect(response.body.output.debtName).toBe('Test Home Loan');
    });

    it('should return 400 when debt not found', async () => {
      const fakeId = new Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/debt/get-debt/${fakeId}`)
        .set('accessToken', authToken)
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message).toContain('Debt not exist');
    });

    it('should return 400 when debtId is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/debt/get-debt/invalid-id')
        .set('accessToken', authToken)
        .expect(400);

      expect(response.body.status).toBe(false);
    });
  });

  describe('GET /api/v1/debt/list-debts', () => {
    it('should list all debts for user', async () => {
      // Create additional debts
      await Debt.create({
        userId: testUserId,
        debtDetails: {
          debtName: 'Car Loan',
          startDate: new Date('2024-01-01'),
          expectedEndDate: new Date('2029-01-01'),
          totalAmount: 500000,
          remainingAmount: 400000,
          interestRate: 9.5,
          debtStatus: 'ACTIVE',
          monthlyExpectedEMI: 12000,
          monthlyActualEMI: 12000,
          partPayment: 0,
          paymentDate: new Date('2024-01-10'),
          lender: 'SBI',
        },
      });

      const response = await request(app)
        .get('/api/v1/debt/list-debts')
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output).toHaveLength(2);
      expect(response.body.output[0].debtName).toBeDefined();
      expect(response.body.output[0].principal).toBeDefined();
    });

    it('should return empty array when user has no debts', async () => {
      await clearDatabase();

      // Recreate user and auth
      const testUser = await User.create({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
        role: 'USER',
      });

      const newToken = jwtHandler.createJwtToken({
        email: testUser.email,
        userId: testUser._id,
        userType: 'USER',
      });

      await UserLogin.create({
        userId: testUser._id,
        email: testUser.email,
        accessToken: newToken,
      });

      const response = await request(app)
        .get('/api/v1/debt/list-debts')
        .set('accessToken', newToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output).toEqual([]);
    });
  });

  describe('DELETE /api/v1/debt/delete-debt/:debtId', () => {
    it('should delete debt successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/debt/delete-debt/${testDebtId}`)
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output).toBe('Debt deleted successfully');

      // Verify deletion
      const debt = await Debt.findById(testDebtId);
      expect(debt).toBeNull();
    });

    it('should return 400 when debt not found', async () => {
      const fakeId = new Types.ObjectId();
      const response = await request(app)
        .delete(`/api/v1/debt/delete-debt/${fakeId}`)
        .set('accessToken', authToken)
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message).toContain('Debt not exist');
    });

    it('should return 400 when debtId is invalid', async () => {
      const response = await request(app)
        .delete('/api/v1/debt/delete-debt/invalid-id')
        .set('accessToken', authToken)
        .expect(400);

      expect(response.body.status).toBe(false);
    });
  });

  describe('POST /api/v1/debt/record-payment', () => {
    it('should record payment and update remaining amount', async () => {
      const paymentData = {
        debtId: testDebtId.toString(),
        amount: 50000,
        paymentDate: new Date().toISOString(),
        notes: 'First EMI payment',
      };

      const response = await request(app)
        .post('/api/v1/debt/record-payment')
        .set('accessToken', authToken)
        .send(paymentData)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output.payment).toBeDefined();
      expect(response.body.output.payment.amount).toBe(50000);
      expect(response.body.output.updatedDebt.remainingBalance).toBe(4750000);

      // Verify payment in database
      const payment = await DebtPayment.findById(response.body.output.payment._id);
      expect(payment).toBeDefined();
      expect(payment?.notes).toBe('First EMI payment');
    });

    it('should mark debt as PAID when fully paid', async () => {
      // Update debt to small remaining amount
      await Debt.findByIdAndUpdate(testDebtId, {
        'debtDetails.remainingAmount': 25000,
      });

      const paymentData = {
        debtId: testDebtId.toString(),
        amount: 25000,
        paymentDate: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/v1/debt/record-payment')
        .set('accessToken', authToken)
        .send(paymentData)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output.updatedDebt.status).toBe('PAID');
      expect(response.body.output.updatedDebt.remainingBalance).toBe(0);
      expect(response.body.output.message).toContain('PAID');
    });

    it('should return 400 when payment amount is zero', async () => {
      const response = await request(app)
        .post('/api/v1/debt/record-payment')
        .set('accessToken', authToken)
        .send({
          debtId: testDebtId.toString(),
          amount: 0,
          paymentDate: new Date().toISOString(),
        })
        .expect(400);

      expect(response.body.status).toBe(false);
    });

    it('should return 400 when payment amount exceeds remaining', async () => {
      const response = await request(app)
        .post('/api/v1/debt/record-payment')
        .set('accessToken', authToken)
        .send({
          debtId: testDebtId.toString(),
          amount: 5000000,
          paymentDate: new Date().toISOString(),
        })
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message).toContain('cannot exceed remaining amount');
    });

    it('should return 400 when debt not found', async () => {
      const fakeId = new Types.ObjectId();
      const response = await request(app)
        .post('/api/v1/debt/record-payment')
        .set('accessToken', authToken)
        .send({
          debtId: fakeId.toString(),
          amount: 10000,
          paymentDate: new Date().toISOString(),
        })
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message).toContain('Debt not found');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/debt/record-payment')
        .set('accessToken', authToken)
        .send({
          debtId: testDebtId.toString(),
        })
        .expect(400);

      expect(response.body.status).toBe(false);
    });
  });

  describe('GET /api/v1/debt/payment-history/:debtId', () => {
    beforeEach(async () => {
      // Create payment history
      await DebtPayment.create([
        {
          userId: testUserId,
          debtId: testDebtId,
          amount: 50000,
          paymentDate: new Date('2024-01-15'),
          notes: 'January payment',
        },
        {
          userId: testUserId,
          debtId: testDebtId,
          amount: 50000,
          paymentDate: new Date('2024-02-15'),
          notes: 'February payment',
        },
        {
          userId: testUserId,
          debtId: testDebtId,
          amount: 60000,
          paymentDate: new Date('2024-03-15'),
          notes: 'March payment with extra',
        },
      ]);
    });

    it('should return payment history for a debt', async () => {
      const response = await request(app)
        .get(`/api/v1/debt/payment-history/${testDebtId}`)
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output.payments).toHaveLength(3);
      expect(response.body.output.totalPaid).toBe(160000);
      expect(response.body.output.paymentCount).toBe(3);
      expect(response.body.output.debtName).toBe('Test Home Loan');
    });

    it('should return empty history for debt with no payments', async () => {
      // Create new debt without payments
      const newDebt = await Debt.create({
        userId: testUserId,
        debtDetails: {
          debtName: 'New Loan',
          startDate: new Date('2024-01-01'),
          expectedEndDate: new Date('2029-01-01'),
          totalAmount: 100000,
          remainingAmount: 100000,
          interestRate: 10,
          debtStatus: 'ACTIVE',
          monthlyExpectedEMI: 2000,
          monthlyActualEMI: 2000,
          partPayment: 0,
          paymentDate: new Date('2024-01-10'),
          lender: 'Test Bank',
        },
      });

      const response = await request(app)
        .get(`/api/v1/debt/payment-history/${newDebt._id}`)
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output.payments).toHaveLength(0);
      expect(response.body.output.totalPaid).toBe(0);
    });

    it('should return 400 when debt not found', async () => {
      const fakeId = new Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/debt/payment-history/${fakeId}`)
        .set('accessToken', authToken)
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message).toContain('Debt not found');
    });

    it('should return 400 when debtId is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/debt/payment-history/invalid-id')
        .set('accessToken', authToken)
        .expect(400);

      expect(response.body.status).toBe(false);
    });
  });

  describe('GET /api/v1/debt/payoff-projection/:debtId', () => {
    it('should calculate payoff projection correctly', async () => {
      const response = await request(app)
        .get(`/api/v1/debt/payoff-projection/${testDebtId}`)
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output.monthlyPayment).toBe(40000);
      expect(response.body.output.totalMonths).toBeGreaterThan(0);
      expect(response.body.output.totalInterest).toBeGreaterThan(0);
      expect(response.body.output.totalPayment).toBeGreaterThan(4800000);
      expect(response.body.output.payoffDate).toBeDefined();
      expect(response.body.output.monthlyBreakdown).toBeDefined();
      expect(response.body.output.monthlyBreakdown.length).toBeGreaterThan(0);
    });

    it('should handle zero interest rate', async () => {
      // Create debt with 0% interest
      const zeroInterestDebt = await Debt.create({
        userId: testUserId,
        debtDetails: {
          debtName: 'Interest-free Loan',
          startDate: new Date('2024-01-01'),
          expectedEndDate: new Date('2025-01-01'),
          totalAmount: 100000,
          remainingAmount: 100000,
          interestRate: 0,
          debtStatus: 'ACTIVE',
          monthlyExpectedEMI: 10000,
          monthlyActualEMI: 10000,
          partPayment: 0,
          paymentDate: new Date('2024-01-10'),
          lender: 'Family',
        },
      });

      const response = await request(app)
        .get(`/api/v1/debt/payoff-projection/${zeroInterestDebt._id}`)
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output.totalMonths).toBe(10);
      expect(response.body.output.totalInterest).toBe(0);
      expect(response.body.output.totalPayment).toBe(100000);
    });

    it('should return 400 when debt not found', async () => {
      const fakeId = new Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/debt/payoff-projection/${fakeId}`)
        .set('accessToken', authToken)
        .expect(400);

      expect(response.body.status).toBe(false);
      expect(response.body.message).toContain('Debt not found');
    });

    it('should return 400 when debtId is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/debt/payoff-projection/invalid-id')
        .set('accessToken', authToken)
        .expect(400);

      expect(response.body.status).toBe(false);
    });
  });

  describe('GET /api/v1/debt/summary', () => {
    beforeEach(async () => {
      // Create multiple debts with different statuses
      await Debt.create([
        {
          userId: testUserId,
          debtDetails: {
            debtName: 'Car Loan',
            startDate: new Date('2024-01-01'),
            expectedEndDate: new Date('2029-01-01'),
            totalAmount: 800000,
            remainingAmount: 0,
            interestRate: 9.5,
            debtStatus: 'PAID',
            monthlyExpectedEMI: 15000,
            monthlyActualEMI: 15000,
            partPayment: 0,
            paymentDate: new Date('2024-01-10'),
            lender: 'SBI',
          },
        },
        {
          userId: testUserId,
          debtDetails: {
            debtName: 'Personal Loan',
            startDate: new Date('2024-01-01'),
            expectedEndDate: new Date('2027-01-01'),
            totalAmount: 200000,
            remainingAmount: 100000,
            interestRate: 12,
            debtStatus: 'ACTIVE',
            monthlyExpectedEMI: 5000,
            monthlyActualEMI: 5000,
            partPayment: 0,
            paymentDate: new Date('2024-01-15'),
            lender: 'HDFC',
          },
        },
      ]);
    });

    it('should return comprehensive debt summary', async () => {
      const response = await request(app)
        .get('/api/v1/debt/summary')
        .set('accessToken', authToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output.totalDebt).toBe(6000000); // 5M + 800K + 200K
      expect(response.body.output.totalRemaining).toBe(4900000); // 4.8M + 0 + 100K
      expect(response.body.output.totalPaid).toBe(1100000);
      expect(response.body.output.totalMonthlyEMI).toBe(45000); // Only active: 40K + 5K
      expect(response.body.output.activeDebtsCount).toBe(2);
      expect(response.body.output.paidDebtsCount).toBe(1);
      expect(response.body.output.overallProgress).toBeGreaterThan(0);
      expect(response.body.output.highestInterestDebt).toBeDefined();
      expect(response.body.output.debts).toHaveLength(3);
    });

    it('should calculate progress percentage correctly', async () => {
      const response = await request(app)
        .get('/api/v1/debt/summary')
        .set('accessToken', authToken)
        .expect(200);

      const paidDebt = response.body.output.debts.find(
        (d: { status: string }) => d.status === 'PAID'
      );
      expect(paidDebt.progressPercentage).toBe(100);

      const activeDebt = response.body.output.debts.find(
        (d: { debtName: string }) => d.debtName === 'Personal Loan'
      );
      expect(activeDebt.progressPercentage).toBe(50);
    });

    it('should return empty summary when no debts', async () => {
      await clearDatabase();

      // Create new user
      const newUser = await User.create({
        email: 'nouser@example.com',
        password: 'password123',
        fullName: 'No Debt User',
        role: 'USER',
      });

      const newToken = jwtHandler.createJwtToken({
        email: newUser.email,
        userId: newUser._id,
        userType: 'USER',
      });

      await UserLogin.create({
        userId: newUser._id,
        email: newUser.email,
        accessToken: newToken,
      });

      const response = await request(app)
        .get('/api/v1/debt/summary')
        .set('accessToken', newToken)
        .expect(200);

      expect(response.body.status).toBe(true);
      expect(response.body.output.totalDebt).toBe(0);
      expect(response.body.output.activeDebtsCount).toBe(0);
      expect(response.body.output.paidDebtsCount).toBe(0);
      expect(response.body.output.overallProgress).toBe(0);
      expect(response.body.output.highestInterestDebt).toBeNull();
      expect(response.body.output.debts).toHaveLength(0);
    });

    it('should only include active debts in monthly EMI', async () => {
      const response = await request(app)
        .get('/api/v1/debt/summary')
        .set('accessToken', authToken)
        .expect(200);

      // PAID debt should not be counted in totalMonthlyEMI
      expect(response.body.output.totalMonthlyEMI).toBe(45000);
      expect(response.body.output.totalMonthlyEMI).not.toBe(60000); // Would be 60K if PAID was included
    });
  });
});
