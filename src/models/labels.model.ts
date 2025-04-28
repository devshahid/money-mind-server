import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILabelsModel extends Document {
  _id: Types.ObjectId;
  createdBy: Types.ObjectId;
  labelName: string;
  labelColor: string;
}

const labelsSchema: Schema<ILabelsModel> = new Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    labelName: { type: String, required: true },
    labelColor: { type: String },
  },
  { timestamps: true, versionKey: false }
);

const Labels = mongoose.model<ILabelsModel>('Labels', labelsSchema);
export { Labels };
