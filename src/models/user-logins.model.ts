import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUserLoginModel extends Document {
  _id: Types.ObjectId;
  email: string;
  userId: Types.ObjectId;
  accessToken: string;
}

const userLoginSchema: Schema<IUserLoginModel> = new Schema(
  {
    email: {
      type: String,
      lowercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    accessToken: {
      type: String,
    },
  },
  { timestamps: true, versionKey: false }
);

// Create a compound index on email and role
userLoginSchema.index({ email: 1 }, { unique: true });

const UserLogin = mongoose.model<IUserLoginModel>('UserLogin', userLoginSchema);
export { UserLogin };
