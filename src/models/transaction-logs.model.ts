import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface ITransactionPayload {
  closingBalance: number;
  date: string;
  depositAmount: string;
  narration: string;
  refNumber: string;
  valueDate: string;
  withdrawlAmount: string;
  isCash: boolean;
}

export interface ITransactionLogs extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  transactionDate: Date;
  narration: string;
  notes: string;
  category: string;
  label: string | string[];
  amount: number;
  status: string;
  uploadKey: string;
  isCredit: boolean;
  isCash: boolean;
  bankName: string;
  hashMap: string;
}

const transactionLogsSchema = new Schema<ITransactionLogs>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transactionDate: { type: Date },
    narration: { type: String },
    notes: { type: String },
    category: { type: String },
    label: { type: [String] },
    amount: { type: Number },
    status: { type: String, default: 'PENDING' },
    uploadKey: { type: String },
    isCredit: { type: Boolean },
    isCash: { type: Boolean },
    bankName: { type: String },
    hashMap: { type: String },
  },
  { timestamps: true, versionKey: false }
);

const TransactionLogs = model<ITransactionLogs>('TransactionLogs', transactionLogsSchema);
export { TransactionLogs };
