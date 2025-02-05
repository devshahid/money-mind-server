import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IncomeSource {
  month: string; // Example: "January"
  year: number; // Example: 2024
  type: string; // Salary, Freelance, Investments, Business, etc.
  sourceName: string; // bank, company name, father, sip
  amount: number; // Income amount from this source
  receivedDate: Date; // Date when the income was received
  notes?: string; // Additional details (optional)
}

export interface IIncome extends Document {
  userId: Types.ObjectId;
  month: string; // Example: "January"
  year: number; // Example: 2024
  type: string; // Salary, Freelance, Investments, Business, etc.
  sourceName: string; // bank, company name, father, sip
  amount: number; // Income amount from this source
  receivedDate: Date; // Date when the income was received
  notes?: string; // Additional details (optional)
}

const incomeSchema = new Schema<IIncome>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    type: { type: String, required: true },
    sourceName: { type: String, required: true },
    amount: { type: Number, required: true },
    receivedDate: { type: Date, required: true },
    notes: { type: String },
  },
  { timestamps: true, versionKey: false }
);

const Income = mongoose.model<IIncome>('Income', incomeSchema);
export { Income };
