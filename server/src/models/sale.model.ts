import mongoose, { Schema, Document, Types } from 'mongoose';
import { getTenantDb } from '../middleware/tenant-context';

export interface ISaleItem {
  _id?: Types.ObjectId;
  itemType: 'recipe' | 'tray';
  recipeId?: Types.ObjectId;
  trayId?: Types.ObjectId;
  recipeName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  // Cost snapshot captured at sale time. Optional for legacy sales predating
  // the change; aggregations fall back to 0 via $ifNull.
  costAtSale?: number;
  subtotalCost?: number;
}

export interface ISale {
  items: ISaleItem[];
  total: number;
  totalCost?: number;
  deletedAt?: Date | null;
}

export type SaleDocument = ISale & Document;

const SaleItemSchema = new Schema(
  {
    itemType: {
      type: String,
      enum: ['recipe', 'tray'],
      default: 'recipe',
    },
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: false,
    },
    trayId: {
      type: Schema.Types.ObjectId,
      ref: 'Tray',
      required: false,
    },
    recipeName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    costAtSale: { type: Number, required: false, min: 0 },
    subtotalCost: { type: Number, required: false, min: 0 },
  },
  { _id: true },
);

const SaleSchema = new Schema<SaleDocument>(
  {
    items: { type: [SaleItemSchema], required: true },
    total: { type: Number, required: true, default: 0, min: 0 },
    totalCost: { type: Number, required: false, default: 0, min: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

SaleSchema.index({ createdAt: -1 });

export function getSaleModel(): mongoose.Model<SaleDocument> {
  const db = mongoose.connection.useDb(getTenantDb(), { useCache: true });
  return (db.models['Sale'] as mongoose.Model<SaleDocument>) ??
    db.model<SaleDocument>('Sale', SaleSchema);
}
