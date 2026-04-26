import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IMember {
  _id?: Types.ObjectId;
  name: string;
  share: number;
  paid: number;
  percentage: number;
}

export type SplitType =
  | 'EQUAL_INCLUDE_PAYER'
  | 'EQUAL_EXCLUDE_PAYER'
  | 'CUSTOM_AMOUNTS'
  | 'PERCENTAGE_SPLIT'
  | 'LOAN'
  | 'ITEMIZED';

export interface ITransactionGroupModel extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  clientId: string;
  name: string;
  involvedParty: string;
  members: IMember[];
  notes: string;
  transactionIds: string[];
  splitType: SplitType;
  splitConfig: Record<string, unknown> | null;
}

const transactionGroupSchema = new Schema<ITransactionGroupModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    involvedParty: {
      type: String,
      default: '',
      trim: true,
    },
    members: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedMember', required: false },
        name: { type: String, required: true, trim: true },
        share: { type: Number, default: 0, min: 0 },
        paid: { type: Number, default: 0, min: 0 },
        percentage: { type: Number, default: 0, min: 0, max: 100 },
      },
    ],
    notes: {
      type: String,
      default: '',
    },
    transactionIds: [
      {
        type: String,
      },
    ],
    splitType: {
      type: String,
      enum: [
        'EQUAL_INCLUDE_PAYER',
        'EQUAL_EXCLUDE_PAYER',
        'CUSTOM_AMOUNTS',
        'PERCENTAGE_SPLIT',
        'LOAN',
        'ITEMIZED',
      ],
      default: 'EQUAL_INCLUDE_PAYER',
    },
    splitConfig: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

transactionGroupSchema.index({ userId: 1, clientId: 1 }, { unique: true });

const TransactionGroup = model<ITransactionGroupModel>('TransactionGroup', transactionGroupSchema);
export { TransactionGroup };
