import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDebtDetails {
  debtName: string;
  startDate: Date;
  expectedEndDate: Date;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  debtStatus: string;
  monthlyExpectedEMI: number;
  monthlyActualEMI: number;
  partPayment: number;
  paymentDate: Date;
  lender: string;
  emiType?: 'INTEREST_ONLY' | 'PRINCIPAL_AND_INTEREST'; // Type of EMI payment
  principalComponent?: number; // Amount going towards principal
  interestComponent?: number; // Amount going towards interest
}
export interface IDebtMdodel extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  debtDetails: IDebtDetails;
}

const debtSchema: Schema<IDebtMdodel> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    debtDetails: {
      debtName: {
        type: String,
      },
      startDate: {
        type: Date,
      },
      expectedEndDate: {
        type: Date,
        required: true,
      },
      totalAmount: {
        type: Number,
        required: true,
      },
      remainingAmount: {
        type: Number,
        required: true,
      },
      interestRate: {
        type: Number,
        required: true,
      },
      debtStatus: {
        type: String,
        required: true,
      },
      monthlyExpectedEMI: {
        type: Number,
        required: true,
      },
      monthlyActualEMI: {
        type: Number,
        required: true,
      },
      partPayment: {
        type: Number,
      },
      paymentDate: {
        type: Date,
        required: true,
      },
      lender: {
        type: String,
      },
      emiType: {
        type: String,
        enum: ['INTEREST_ONLY', 'PRINCIPAL_AND_INTEREST'],
        default: 'PRINCIPAL_AND_INTEREST',
      },
      principalComponent: {
        type: Number,
        default: 0,
      },
      interestComponent: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true, versionKey: false }
);

const Debt = mongoose.model<IDebtMdodel>('Debt', debtSchema);
export { Debt };
