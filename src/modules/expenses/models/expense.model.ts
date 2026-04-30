import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategoryItems {
  itemName: string;
  expectedAmount: number;
  actualAmount: number;
  isPaid: boolean;
  expenseFixedDate: number;
  paymentDate: Date;
  recurring: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
}
export interface IExpenseModel extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  itemDetails: ICategoryItems;
}

const expenseSchema: Schema<IExpenseModel> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    itemDetails: {
      itemName: {
        type: String,
        required: true,
      },
      expectedAmount: {
        type: Number,
        required: true,
      },
      actualAmount: {
        type: Number,
        required: true,
      },
      isPaid: {
        type: Boolean,
        default: false,
      },
      expenseFixedDate: {
        type: Number,
        required: true,
      },
      paymentDate: {
        type: Date,
      },
    },
  },
  { timestamps: true, versionKey: false }
);

const Expense = mongoose.model<IExpenseModel>('Expense', expenseSchema);
export { Expense };
