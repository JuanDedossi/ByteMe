import mongoose, { Schema, Document, Types } from 'mongoose';
import { getTenantDb } from '../middleware/tenant-context';

export interface ITrayRecipe {
  recipeId: Types.ObjectId;
  quantity: number;
}

export interface ITrayComplement {
  complementId: Types.ObjectId;
  quantity: number;
}

export interface ITray {
  name: string;
  recipes: ITrayRecipe[];
  complements: ITrayComplement[];
  profitRuleId: Types.ObjectId;
  customSellingPrice: number | null;
  stock: number;
  isActive: boolean;
}

export type TrayDocument = ITray & Document;

const TrayRecipeSchema = new Schema(
  {
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const TrayComplementSchema = new Schema(
  {
    complementId: {
      type: Schema.Types.ObjectId,
      ref: 'Complement',
      required: true,
    },
    // REQ-CMP-7 / REQ-TRA-15: unit-aware validation is enforced at the API
    // boundary (Zod + service helper). The Mongoose `min` is a defensive
    // floor against negatives only — both `unidad` (>= 1) and `metro` (> 0)
    // quantities pass at this layer; the service rejects the specific unit
    // violations before persistence.
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const TraySchema = new Schema<TrayDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    recipes: { type: [TrayRecipeSchema], default: [] },
    complements: { type: [TrayComplementSchema], default: [] },
    profitRuleId: {
      type: Schema.Types.ObjectId,
      ref: 'ProfitRule',
      required: true,
    },
    customSellingPrice: { type: Number, default: null },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Index for cascade: find all trays referencing a given complement.
TraySchema.index({ 'complements.complementId': 1 });

export function getTrayModel(): mongoose.Model<TrayDocument> {
  const db = mongoose.connection.useDb(getTenantDb(), { useCache: true });
  return (
    (db.models['Tray'] as mongoose.Model<TrayDocument>) ??
    db.model<TrayDocument>('Tray', TraySchema)
  );
}
