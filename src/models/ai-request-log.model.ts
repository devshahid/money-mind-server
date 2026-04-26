import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IAIRequestLog extends Document {
  userId: Types.ObjectId;
  endpoint: string;
  requestTimestamp: Date;
  responseTimestamp?: Date;
  tokenCount?: number;
  status: 'success' | 'error';
}

const aiRequestLogSchema = new Schema<IAIRequestLog>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    requestTimestamp: {
      type: Date,
      default: Date.now,
    },
    responseTimestamp: {
      type: Date,
    },
    tokenCount: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['success', 'error'],
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const AIRequestLog = model<IAIRequestLog>('AIRequestLog', aiRequestLogSchema);
export { AIRequestLog };
