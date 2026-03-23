import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface ITransactionGroup extends Document {
  userId: Types.ObjectId;
  groupName: string;
  description?: string;
  transactionIds: Types.ObjectId[];
  totalAmount: number;
  isCredit?: boolean;
}

const transactionGroupSchema = new Schema<ITransactionGroup>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    transactionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TransactionLogs',
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
    },
    isCredit: {
      type: Boolean,
    },
  },
  { timestamps: true, versionKey: false }
);

const TransactionGroup = model<ITransactionGroup>('TransactionGroup', transactionGroupSchema);
export { TransactionGroup };
