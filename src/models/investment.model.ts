import mongoose, { Document, Schema, Types } from 'mongoose';

interface IInvestment extends Document {
  userId: Types.ObjectId;
  type: 'SIP' | 'STOCKS' | 'INSAURANCE' | 'BITCOIN';
  amount: number;
  frequency: 'MONTHLY' | 'YEARLY';
  startDate: Date;
  endDate?: Date;
}

const InvestmentSchema = new Schema<IInvestment>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['SIP', 'STOCKS', 'INSAURANCE', 'BITCOIN'],
  },
  amount: {
    type: Number,
    required: true,
  },
  frequency: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
});

const Investment = mongoose.model<IInvestment>('Investment', InvestmentSchema);
export { Investment };
