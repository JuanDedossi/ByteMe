import mongoose, { Schema, Document } from 'mongoose';
import { getTenantDb } from '../middleware/tenant-context';

export interface IProfitRule {
  name: string;
  description: string;
  markupPercentage: number;
}

export type ProfitRuleDocument = IProfitRule & Document;

const ProfitRuleSchema = new Schema<ProfitRuleDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    markupPercentage: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

export function getProfitRuleModel(): mongoose.Model<ProfitRuleDocument> {
  const db = mongoose.connection.useDb(getTenantDb(), { useCache: true });
  return (db.models['ProfitRule'] as mongoose.Model<ProfitRuleDocument>) ??
    db.model<ProfitRuleDocument>('ProfitRule', ProfitRuleSchema);
}
