import mongoose, { Schema, model, Document, Types } from 'mongoose';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ICategorySuggestion {
  transactionId: string;
  narration: string;
  amount: number;
  isCredit: boolean;
  currentCategory: string;
  suggestedCategory: string;
  confidence: number;
  reasoning: string;
  transactionDate: string | null;
  bankName: string;
}

export interface ICategorizationJob extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  status: JobStatus;
  totalTransactions: number;
  processedTransactions: number;
  suggestions: ICategorySuggestion[];
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

const categorySuggestionSchema = new Schema<ICategorySuggestion>(
  {
    transactionId: { type: String, required: true },
    narration: { type: String, required: true },
    amount: { type: Number, required: true },
    isCredit: { type: Boolean, required: true },
    currentCategory: { type: String, default: '' },
    suggestedCategory: { type: String, required: true },
    confidence: { type: Number, required: true },
    reasoning: { type: String, required: true },
    transactionDate: { type: String, default: null },
    bankName: { type: String, default: '' },
  },
  { _id: false }
);

const categorizationJobSchema = new Schema<ICategorizationJob>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    totalTransactions: { type: Number, required: true },
    processedTransactions: { type: Number, default: 0 },
    suggestions: [categorySuggestionSchema],
    error: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

// Index for finding active jobs per user (deduplication)
categorizationJobSchema.index({ userId: 1, status: 1 });
// TTL: auto-delete completed/failed jobs after 24 hours
categorizationJobSchema.index({ completedAt: 1 }, { expireAfterSeconds: 86400 });

const CategorizationJob = model<ICategorizationJob>('CategorizationJob', categorizationJobSchema);
export { CategorizationJob };
