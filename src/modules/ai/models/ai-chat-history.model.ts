import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IAIChatHistory extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sessionId: string; // Unique session identifier
  messages: IChatMessage[];
  lastMessageAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const aiChatHistorySchema = new Schema<IAIChatHistory>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    messages: [chatMessageSchema],
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, versionKey: false }
);

// Index for efficient lookups
aiChatHistorySchema.index({ userId: 1, sessionId: 1 });
aiChatHistorySchema.index({ userId: 1, lastMessageAt: -1 });

const AIChatHistory = model<IAIChatHistory>('AIChatHistory', aiChatHistorySchema);
export { AIChatHistory };
