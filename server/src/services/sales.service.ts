import mongoose, { Types } from 'mongoose';
import { getSaleModel, SaleDocument } from '../models/sale.model';
import { getRecipeModel } from '../models/recipe.model';
import { getTrayModel } from '../models/tray.model';
import { findRecipeById } from './recipes.service';
import { findTrayById } from './trays.service';
import { roundCurrency } from '../utils/currency';

export interface CreateSaleInput {
  items: { recipeId?: string; trayId?: string; quantity: number }[];
}

export async function findAllSales(
  page = 1,
  limit = 20,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<{ data: SaleDocument[]; total: number }> {
  const Sale = getSaleModel();
  const query: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = dateFrom;
    if (dateTo) range.$lte = dateTo;
    query.createdAt = range;
  }
  const [data, total] = await Promise.all([
    Sale.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
    Sale.countDocuments(query),
  ]);
  return { data: data as SaleDocument[], total };
}

export async function getSaleStats(): Promise<{
  weekly: number;
  monthly: number;
}> {
  const Sale = getSaleModel();
  const now = new Date();
  // UTC boundaries para coincidir con los timestamps de MongoDB
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday),
  );
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [weeklyResult, monthlyResult] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ]);

  return {
    weekly: weeklyResult[0]?.total ?? 0,
    monthly: monthlyResult[0]?.total ?? 0,
  };
}

export async function createSale(
  dto: CreateSaleInput,
): Promise<SaleDocument> {
  const Sale = getSaleModel();
  const Recipe = getRecipeModel();
  const Tray = getTrayModel();

  for (const item of dto.items) {
    if (item.recipeId && item.trayId) {
      throw {
        status: 400,
        message: 'item must reference either a recipe or a tray, not both',
      };
    }
    if (!item.recipeId && !item.trayId) {
      throw {
        status: 400,
        message: 'item must reference either a recipe or a tray',
      };
    }
  }

  const recipeItems = dto.items.filter((i) => i.recipeId);
  const trayItems = dto.items.filter((i) => i.trayId);

  // Fetch enriched data for pricing (names, prices, etc.)
  const [recipes, trays] = await Promise.all([
    Promise.all(recipeItems.map((item) => findRecipeById(item.recipeId!))),
    Promise.all(trayItems.map((item) => findTrayById(item.trayId!))),
  ]);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Atomic stock deduction within the transaction
    const [recipeUpdates, trayUpdates] = await Promise.all([
      Promise.all(
        recipeItems.map((item) =>
          Recipe.findOneAndUpdate(
            { _id: item.recipeId, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { new: true, session },
          ),
        ),
      ),
      Promise.all(
        trayItems.map((item) =>
          Tray.findOneAndUpdate(
            { _id: item.trayId, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { new: true, session },
          ),
        ),
      ),
    ]);

    // Check for insufficient stock
    const errors: string[] = [];
    for (let i = 0; i < recipeItems.length; i++) {
      if (!recipeUpdates[i]) {
        errors.push(`Stock insuficiente de "${recipes[i].name}"`);
      }
    }
    for (let i = 0; i < trayItems.length; i++) {
      if (!trayUpdates[i]) {
        errors.push(`Stock insuficiente de bandeja "${trays[i].name}"`);
      }
    }
    if (errors.length > 0) {
      throw { status: 409, message: errors.join(' | ') };
    }

    // Build sale items
    const saleItems = [
      ...recipeItems.map((item, i) => {
        const recipe = recipes[i];
        let subtotal: number;
        let unitPrice: number;

        if (recipe.sellUnit === 'kg') {
          unitPrice = recipe.pricePerKg;
          subtotal = roundCurrency((item.quantity / 1000) * recipe.pricePerKg);
        } else {
          unitPrice = recipe.sellingPrice;
          subtotal = roundCurrency(item.quantity * recipe.sellingPrice);
        }

        return {
          itemType: 'recipe' as const,
          recipeId: new Types.ObjectId(item.recipeId!),
          recipeName: recipe.name,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        };
      }),
      ...trayItems.map((item, i) => {
        const tray = trays[i];
        const unitPrice = tray.sellingPrice;
        const subtotal = roundCurrency(item.quantity * unitPrice);

        return {
          itemType: 'tray' as const,
          trayId: new Types.ObjectId(item.trayId!),
          recipeName: tray.name,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        };
      }),
    ];

    const total = roundCurrency(
      saleItems.reduce((sum, item) => sum + item.subtotal, 0),
    );

    const [result] = await Sale.create(
      [{ items: saleItems, total }],
      { session },
    );

    await session.commitTransaction();
    return result as SaleDocument;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
