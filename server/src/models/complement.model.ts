import mongoose, { Schema, Document } from 'mongoose';
import { getTenantDb } from '../middleware/tenant-context';

export type ComplementUnit = 'unidad' | 'metro';

export interface IComplement {
  name: string;
  unit: ComplementUnit;
  costPerUnit: number;
  isActive: boolean;
}

export type ComplementDocument = IComplement & Document;

const ComplementSchema = new Schema<ComplementDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    unit: {
      type: String,
      enum: ['unidad', 'metro'],
      default: 'unidad',
      required: true,
    },
    costPerUnit: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ComplementSchema.index({ name: 'text' });

export function getComplementModel(): mongoose.Model<ComplementDocument> {
  const db = mongoose.connection.useDb(getTenantDb(), { useCache: true });
  return (db.models['Complement'] as mongoose.Model<ComplementDocument>) ??
    db.model<ComplementDocument>('Complement', ComplementSchema);
}
