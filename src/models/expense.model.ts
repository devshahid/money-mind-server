import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IExpenseModel extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  category: [
    {
      item: string;
      expectedAmount: number;
      actualAmount: number;
      isPaid: boolean;
      expenseFixedDate: Date;
      paymentDate: Date;
    },
  ];
}

const expenseSchema: Schema<IExpenseModel> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: [
      {
        item: {
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
          type: Date,
          required: true,
        },
        paymentDate: {
          type: Date,
          required: true,
        },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

const Expense = mongoose.model<IExpenseModel>('Expense', expenseSchema);
export { Expense };
