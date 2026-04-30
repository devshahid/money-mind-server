import mongoose, { Schema, model, Document, Types } from 'mongoose';

interface IGoal extends Document {
  userId: Types.ObjectId; // Reference to the user
  name: string; // Name of the goal (e.g., "Buy a Car", "Trip to Europe")
  category: string; // Category of the goal (e.g., "Car", "Travel", "Marriage")
  targetAmount: number; // Total amount needed to achieve the goal
  savedAmount: number; // Amount saved so far
  targetDate: Date; // Deadline for achieving the goal
  priority: 'low' | 'medium' | 'high'; // Priority level
  description?: string; // Optional description of the goal
  status: 'active' | 'completed' | 'cancelled'; // Current status of the goal
}

const goalSchema = new Schema<IGoal>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    targetAmount: {
      type: Number,
      required: true,
    },
    savedAmount: {
      type: Number,
      default: 0,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true, versionKey: false }
);

const Goal = model<IGoal>('Goal', goalSchema);
export { Goal };
