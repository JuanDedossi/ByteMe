import mongoose, { Types } from 'mongoose';
import { getSaleModel, SaleDocument } from '../models/sale.model';
import { getRecipeModel, RecipeDocument } from '../models/recipe.model';
import { getTrayModel, TrayDocument } from '../models/tray.model';
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
  // Local-time boundaries (consistente con sales.routes.ts y SalesHistoryPage).
  // `new Date(y, m, d)` representa el instante local de medianoche; MongoDB compara
  // correctamente contra `createdAt` en UTC porque ambos son el mismo instante.
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const weekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diffToMonday,
  );
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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

  // Aggregate quantities per unique ID before the transaction. Doing one
  // findOneAndUpdate per duplicate ID in parallel causes MongoDB transaction
  // number conflicts ("Given transaction number N does not match any in-progress
  // transactions") when two updates target the same document within the same
  // session — see sales batch 500 bug.
  const recipeQtyMap = new Map<string, number>();
  for (const item of recipeItems) {
    recipeQtyMap.set(
      item.recipeId!,
      (recipeQtyMap.get(item.recipeId!) ?? 0) + item.quantity,
    );
  }
  const trayQtyMap = new Map<string, number>();
  for (const item of trayItems) {
    trayQtyMap.set(
      item.trayId!,
      (trayQtyMap.get(item.trayId!) ?? 0) + item.quantity,
    );
  }
  const recipeAggregated = Array.from(recipeQtyMap, ([id, quantity]) => ({
    id,
    quantity,
  }));
  const trayAggregated = Array.from(trayQtyMap, ([id, quantity]) => ({
    id,
    quantity,
  }));

  const recipeById = new Map(recipes.map((r) => [r._id.toString(), r]));
  const trayById = new Map(trays.map((t) => [t._id.toString(), t]));

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Atomic stock deduction within the transaction — one update per unique ID
    const [recipeUpdates, trayUpdates] = await Promise.all([
      Promise.all(
        recipeAggregated.map(({ id, quantity }) =>
          Recipe.findOneAndUpdate(
            { _id: id, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { new: true, session },
          ),
        ),
      ),
      Promise.all(
        trayAggregated.map(({ id, quantity }) =>
          Tray.findOneAndUpdate(
            { _id: id, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { new: true, session },
          ),
        ),
      ),
    ]);

    // Build per-ID lookup of update results (null = insufficient stock or missing)
    const recipeUpdateById = new Map<string, RecipeDocument | null>(
      recipeUpdates.map((doc, i) => [recipeAggregated[i].id, doc]),
    );
    const trayUpdateById = new Map<string, TrayDocument | null>(
      trayUpdates.map((doc, i) => [trayAggregated[i].id, doc]),
    );

    // Check for insufficient stock — one error per original line item so the user
    // sees which products failed even when there are duplicates.
    const errors: string[] = [];
    for (const item of recipeItems) {
      if (!recipeUpdateById.get(item.recipeId!)) {
        const recipe = recipeById.get(item.recipeId!);
        errors.push(`Stock insuficiente de "${recipe?.name ?? 'desconocido'}"`);
      }
    }
    for (const item of trayItems) {
      if (!trayUpdateById.get(item.trayId!)) {
        const tray = trayById.get(item.trayId!);
        errors.push(`Stock insuficiente de bandeja "${tray?.name ?? 'desconocido'}"`);
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
