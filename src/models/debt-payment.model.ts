import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IDebtPayment extends Document {
  userId: Types.ObjectId;
  debtId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  transactionId?: Types.ObjectId;
  notes?: string;
}

const debtPaymentSchema = new Schema<IDebtPayment>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    debtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Debt',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransactionLogs',
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true, versionKey: false }
);

const DebtPayment = model<IDebtPayment>('DebtPayment', debtPaymentSchema);
export { DebtPayment };
