import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserModel extends Document {
  _id: Types.ObjectId;
  role: 'ADMIN' | 'USER';
  email: string;
  password: string;
  dob: string;
  settings: {
    monthlyReminder: boolean;
  };
  comparePassword(password: string): Promise<boolean>;
}

const userSchema: Schema<IUserModel> = new Schema(
  {
    role: {
      type: String,
      enum: ['ADMIN', 'USER'],
      default: 'USER',
    },
    email: {
      type: String,
      lowercase: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    settings: {
      monthlyReminder: { type: Boolean, default: true },
    },
  },
  { timestamps: true, versionKey: false }
);

// pre hook to encrypt password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/* Compare password method */
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

// Create a compound index on email and role
userSchema.index({ email: 1, role: 1 }, { unique: true });

const User = mongoose.model<IUserModel>('User', userSchema);
export { User };
