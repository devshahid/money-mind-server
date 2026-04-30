import mongoose, { Schema, model, Document, Types } from 'mongoose';

interface IBudgetCategory {
  categoryName: string;
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;
}

interface IBudget extends Document {
  userId: Types.ObjectId;
  month: number;
  totalPlanned: number;
  totalActual: number;
  totalRemaining: number;
  categories: IBudgetCategory[];
  notes?: string;
}

const budgetSchema = new Schema<IBudget>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: Number,
      required: true,
    },
    totalPlanned: {
      type: Number,
      default: 0,
    },
    totalActual: {
      type: Number,
      default: 0,
    },
    totalRemaining: {
      type: Number,
      default: 0,
    },
    categories: [
      {
        categoryName: {
          type: String,
          required: true,
        },
        plannedAmount: {
          type: Number,
          required: true,
        },
        actualAmount: {
          type: Number,
          default: 0,
        },
        remainingAmount: {
          type: Number,
        },
      },
    ],
    notes: { type: String },
  },
  { timestamps: true, versionKey: false }
);

const Budget = model<IBudget>('Budget', budgetSchema);
export { Budget };
