import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategoryModel extends Document {
  _id: Types.ObjectId;
  createdBy: Types.ObjectId;
  categoryName: string;
}

const categorySchema: Schema<ICategoryModel> = new Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    categoryName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const Category = mongoose.model<ICategoryModel>('Category', categorySchema);
export { Category };
