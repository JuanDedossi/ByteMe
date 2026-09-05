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
  weeklyProfit: number;
  monthlyProfit: number;
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
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
        },
      },
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
        },
      },
    ]),
  ]);

  const weeklyTotal = weeklyResult[0]?.total ?? 0;
  const monthlyTotal = monthlyResult[0]?.total ?? 0;
  const weeklyTotalCost = weeklyResult[0]?.totalCost ?? 0;
  const monthlyTotalCost = monthlyResult[0]?.totalCost ?? 0;

  return {
    weekly: weeklyTotal,
    monthly: monthlyTotal,
    weeklyProfit: roundCurrency(weeklyTotal - weeklyTotalCost),
    monthlyProfit: roundCurrency(monthlyTotal - monthlyTotalCost),
  };
}

export async function getSalesSummary(
  dateFrom?: Date,
  dateTo?: Date,
): Promise<{
  count: number;
  totalAmount: number;
  totalCost: number;
  profit: number;
}> {
  const Sale = getSaleModel();
  const query: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = dateFrom;
    if (dateTo) range.$lte = dateTo;
    query.createdAt = range;
  }

  const [result] = await Sale.aggregate([
    { $match: query },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalAmount: { $sum: '$total' },
              totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
            },
          },
          { $project: { _id: 0, count: 1, totalAmount: 1, totalCost: 1 } },
        ],
      },
    },
  ]);

  const summary = result?.summary?.[0] ?? {
    count: 0,
    totalAmount: 0,
    totalCost: 0,
  };
  const totalAmount = summary.totalAmount ?? 0;
  const totalCost = summary.totalCost ?? 0;
  return {
    count: summary.count ?? 0,
    totalAmount,
    totalCost,
    profit: roundCurrency(totalAmount - totalCost),
  };
}

export type BreakdownSortBy = 'quantity' | 'profit' | 'name' | 'lastSoldAt';

export interface BreakdownItem {
  type: 'recipe' | 'tray';
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
  lastSoldAt: string;
}

export async function getSalesBreakdown({
  dateFrom,
  dateTo,
  limit = 10,
  offset = 0,
  sortBy = 'quantity',
}: {
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: BreakdownSortBy;
}): Promise<{ items: BreakdownItem[]; total: number }> {
  const Sale = getSaleModel();
  const match: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = dateFrom;
    if (dateTo) range.$lte = dateTo;
    match.createdAt = range;
  }

  const sortStage: Record<string, 1 | -1> =
    sortBy === 'profit'
      ? { profit: -1, quantity: -1, revenue: -1 }
      : sortBy === 'name'
        ? { name: 1, quantity: -1, revenue: -1 }
        : sortBy === 'lastSoldAt'
          ? { lastSoldAt: -1, quantity: -1, revenue: -1 }
          : { quantity: -1, revenue: -1 };

  const [result] = await Sale.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: {
          type: '$items.itemType',
          id: { $ifNull: ['$items.recipeId', '$items.trayId'] },
        },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
        cost: { $sum: { $ifNull: ['$items.subtotalCost', 0] } },
        snapshotName: { $first: '$items.recipeName' },
        lastSoldAt: { $max: '$createdAt' },
      },
    },
    {
      $lookup: {
        from: 'recipes',
        let: { id: '$_id.id', type: '$_id.type' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$id'] },
                  { $eq: ['$$type', 'recipe'] },
                ],
              },
            },
          },
          { $project: { name: 1 } },
        ],
        as: 'recipe',
      },
    },
    {
      $lookup: {
        from: 'trays',
        let: { id: '$_id.id', type: '$_id.type' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$id'] },
                  { $eq: ['$$type', 'tray'] },
                ],
              },
            },
          },
          { $project: { name: 1 } },
        ],
        as: 'tray',
      },
    },
    {
      $project: {
        _id: 0,
        type: '$_id.type',
        name: {
          $ifNull: [
            { $arrayElemAt: ['$recipe.name', 0] },
            { $ifNull: [{ $arrayElemAt: ['$tray.name', 0] }, '$snapshotName'] },
          ],
        },
        quantity: 1,
        revenue: 1,
        cost: 1,
        profit: { $subtract: ['$revenue', '$cost'] },
        lastSoldAt: 1,
      },
    },
    { $sort: sortStage },
    {
      $facet: {
        items: [{ $skip: offset }, { $limit: limit }],
        total: [{ $count: 'c' }],
      },
    },
  ]);

  const items = (result?.items ?? []).map((item: Omit<BreakdownItem, 'profit' | 'lastSoldAt'> & { cost: number; lastSoldAt: Date | string }) => ({
    type: item.type,
    name: item.name,
    quantity: item.quantity,
    revenue: item.revenue,
    profit: roundCurrency(item.revenue - item.cost),
    lastSoldAt: new Date(item.lastSoldAt).toISOString(),
  }));
  return { items, total: result?.total?.[0]?.c ?? 0 };
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

    // Atomic stock deduction within the transaction. Operations MUST run
    // sequentially — MongoDB requires operations within a transaction to be
    // serialized, and parallel Promise.all triggers
    // "Given transaction number N does not match any in-progress transactions"
    // because each findOneAndUpdate increments txnNumber and parallel calls
    // confuse the server-side transaction state. Confirmed against a MongoDB
    // replica set with mongoose@8.23.0 + mongodb@6.20.0.
    const recipeUpdates: (RecipeDocument | null)[] = [];
    for (const { id, quantity } of recipeAggregated) {
      const updated = await Recipe.findOneAndUpdate(
        { _id: id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true, session },
      );
      recipeUpdates.push(updated);
    }

    const trayUpdates: (TrayDocument | null)[] = [];
    for (const { id, quantity } of trayAggregated) {
      const updated = await Tray.findOneAndUpdate(
        { _id: id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true, session },
      );
      trayUpdates.push(updated);
    }

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

        // Cost snapshot: costBase is the TOTAL cost of the recipe (across
        // all yieldGrams / yieldUnits). The per-unit cost is costBase divided
        // by the yield, mirroring the same logic in cost-calculator.ts for
        // tray recipes. Without this, a single-unit sale of a 10-unit recipe
        // would charge 10x the real cost and drive profit negative.
        const yieldGrams = recipe.yieldGrams ?? 0;
        const yieldUnits = recipe.yieldUnits ?? 1;
        const perUnitCost =
          recipe.sellUnit === 'kg' && yieldGrams > 0
            ? recipe.costBase / yieldGrams
            : recipe.costBase / (yieldUnits || 1);
        const costAtSale = perUnitCost;
        const subtotalCost = roundCurrency(costAtSale * item.quantity);

        return {
          itemType: 'recipe' as const,
          recipeId: new Types.ObjectId(item.recipeId!),
          recipeName: recipe.name,
          quantity: item.quantity,
          unitPrice,
          subtotal,
          costAtSale,
          subtotalCost,
        };
      }),
      ...trayItems.map((item, i) => {
        const tray = trays[i];
        const unitPrice = tray.sellingPrice;
        const subtotal = roundCurrency(item.quantity * unitPrice);

        // Cost snapshot: tray.cost (recipes.costBase + own complements)
        // computed via cost-calculator inside findTrayById.
        const costAtSale = tray.cost;
        const subtotalCost = roundCurrency(costAtSale * item.quantity);

        return {
          itemType: 'tray' as const,
          trayId: new Types.ObjectId(item.trayId!),
          recipeName: tray.name,
          quantity: item.quantity,
          unitPrice,
          subtotal,
          costAtSale,
          subtotalCost,
        };
      }),
    ];

    const total = roundCurrency(
      saleItems.reduce((sum, item) => sum + item.subtotal, 0),
    );
    const totalCost = roundCurrency(
      saleItems.reduce((sum, item) => sum + item.subtotalCost, 0),
    );

    const [result] = await Sale.create(
      [{ items: saleItems, total, totalCost }],
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
