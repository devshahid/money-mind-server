import { Schema, model, Types } from 'mongoose';

export interface IRepaymentScheduleItem {
  month: number;
  dueDate: Date;
  expectedAmount: number;
  principalComponent: number;
  interestComponent: number;
  expectedBalance: number;
  actualPaymentId?: Types.ObjectId;
  linkedTransactionId?: Types.ObjectId;
  status: 'UPCOMING' | 'PAID' | 'PARTIAL' | 'MISSED' | 'OVERPAID';
  variance?: number;
  notes?: string;
}

export interface IRepaymentSchedule {
  _id: Types.ObjectId;
  debtId: Types.ObjectId;
  userId: Types.ObjectId;
  scheduleType: 'MANUAL' | 'IMPORTED' | 'AUTO_GENERATED';
  scheduleItems: IRepaymentScheduleItem[];
  createdAt: Date;
  updatedAt: Date;
}

const repaymentScheduleItemSchema = new Schema<IRepaymentScheduleItem>(
  {
    month: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    expectedAmount: { type: Number, required: true },
    principalComponent: { type: Number, required: true },
    interestComponent: { type: Number, required: true },
    expectedBalance: { type: Number, required: true },
    actualPaymentId: { type: Schema.Types.ObjectId, ref: 'DebtPayment' },
    linkedTransactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    status: {
      type: String,
      enum: ['UPCOMING', 'PAID', 'PARTIAL', 'MISSED', 'OVERPAID'],
      default: 'UPCOMING',
    },
    variance: { type: Number, default: 0 },
    notes: { type: String },
  },
  { _id: false }
);

const repaymentScheduleSchema = new Schema<IRepaymentSchedule>(
  {
    debtId: { type: Schema.Types.ObjectId, ref: 'Debt', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scheduleType: {
      type: String,
      enum: ['MANUAL', 'IMPORTED', 'AUTO_GENERATED'],
      required: true,
    },
    scheduleItems: [repaymentScheduleItemSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
repaymentScheduleSchema.index({ debtId: 1, userId: 1 }, { unique: true });

export const RepaymentSchedule = model<IRepaymentSchedule>(
  'RepaymentSchedule',
  repaymentScheduleSchema
);
