import { Schema, model, Types } from 'mongoose';

export interface IDebtTransactionLink {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  debtId: Types.ObjectId;
  transactionId: Types.ObjectId;
  linkType: 'AUTO' | 'MANUAL';
  confidence?: number; // For AUTO links (0.0 to 1.0)
  linkedDate: Date;
  notes?: string;
  createdBy?: 'SYSTEM' | 'USER';
  createdAt: Date;
  updatedAt: Date;
}

const debtTransactionLinkSchema = new Schema<IDebtTransactionLink>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    debtId: { type: Schema.Types.ObjectId, ref: 'Debt', required: true, index: true },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      index: true,
    },
    linkType: {
      type: String,
      enum: ['AUTO', 'MANUAL'],
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: function (this: IDebtTransactionLink) {
        return this.linkType === 'AUTO';
      },
    },
    linkedDate: { type: Date, default: Date.now },
    notes: { type: String },
    createdBy: {
      type: String,
      enum: ['SYSTEM', 'USER'],
      default: function (this: IDebtTransactionLink) {
        return this.linkType === 'AUTO' ? 'SYSTEM' : 'USER';
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
debtTransactionLinkSchema.index({ debtId: 1, userId: 1 });
debtTransactionLinkSchema.index({ transactionId: 1, userId: 1 });

// Unique constraint: one transaction can only be linked to one debt
debtTransactionLinkSchema.index({ transactionId: 1, userId: 1 }, { unique: true });

export const DebtTransactionLink = model<IDebtTransactionLink>(
  'DebtTransactionLink',
  debtTransactionLinkSchema
);
