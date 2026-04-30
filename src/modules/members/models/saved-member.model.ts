import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface ISavedMemberModel extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
}

const savedMemberSchema = new Schema<ISavedMemberModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

savedMemberSchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

const SavedMember = model<ISavedMemberModel>('SavedMember', savedMemberSchema);
export { SavedMember };
