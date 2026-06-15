import { Types, PipelineStage } from 'mongoose';
import { getTrayModel, TrayDocument } from '../models/tray.model';
import { getRecipeModel } from '../models/recipe.model';
import { findProfitRuleById } from './profit-rules.service';
import { findRecipeById } from './recipes.service';

export interface EnrichedTrayRecipe {
  recipeId: string;
  recipeName: string;
  recipeSellUnit: string;
  recipeYieldUnits: number;
  recipeYieldGrams: number;
  quantity: number;
  cost: number;
}

export interface EnrichedTray {
  _id: Types.ObjectId;
  name: string;
  recipes: EnrichedTrayRecipe[];
  cost: number;
  profitRuleId: Types.ObjectId;
  profitRuleName: string;
  markupPercentage: number;
  sellingPrice: number;
  customSellingPrice: number | null;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTrayInput {
  name: string;
  recipes: { recipeId: string; quantity: number }[];
  profitRuleId: string;
}

export interface UpdateTrayInput {
  name?: string;
  recipes?: { recipeId: string; quantity: number }[];
  profitRuleId?: string;
}

export interface UpdateTrayPriceInput {
  customSellingPrice: number | null;
}

async function enrichTrayDoc(tray: TrayDocument): Promise<EnrichedTray> {
  const recipeIds = [...new Set(tray.recipes.map((r) => r.recipeId.toString()))];

  const [enrichedRecipes, rule] = await Promise.all([
    Promise.all(recipeIds.map((id) => findRecipeById(id).catch(() => null))),
    findProfitRuleById(tray.profitRuleId.toString()).catch(() => null),
  ]);

  const enrichedRecipeMap = new Map(
    enrichedRecipes
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map((r) => [r._id.toString(), r]),
  );

  let totalCost = 0;

  const recipes: EnrichedTrayRecipe[] = tray.recipes.map((tr) => {
    const recipe = enrichedRecipeMap.get(tr.recipeId.toString());
    let cost = 0;
    if (recipe) {
      if (recipe.sellUnit === 'kg' && recipe.yieldGrams > 0) {
        cost = (recipe.cost / recipe.yieldGrams) * tr.quantity;
      } else {
        cost = (recipe.cost / (recipe.yieldUnits || 1)) * tr.quantity;
      }
    }
    totalCost += cost;
    return {
      recipeId: tr.recipeId.toString(),
      recipeName: recipe?.name ?? 'Desconocida',
      recipeSellUnit: recipe?.sellUnit ?? 'unidad',
      recipeYieldUnits: recipe?.yieldUnits ?? 1,
      recipeYieldGrams: recipe?.yieldGrams ?? 0,
      quantity: tr.quantity,
      cost,
    };
  });

  const margin = rule?.markupPercentage ?? 0;
  const customSellingPrice: number | null = (tray as any).customSellingPrice ?? null;

  let sellingPrice: number;
  if (customSellingPrice !== null) {
    sellingPrice = customSellingPrice;
  } else {
    sellingPrice = totalCost * (1 + margin / 100);
  }

  const obj = (tray as any).toObject();

  return {
    ...obj,
    recipes,
    cost: totalCost,
    profitRuleName: rule?.name ?? 'Desconocido',
    markupPercentage: margin,
    sellingPrice,
    customSellingPrice,
  };
}

export async function findAllTrays(
  page = 1,
  limit = 10,
  search?: string,
  sortByStock = false,
  hasStock?: boolean,
): Promise<{ data: EnrichedTray[]; total: number }> {
  const Tray = getTrayModel();
  const query: Record<string, unknown> = search ? { name: { $regex: search, $options: 'i' } } : {};
  if (hasStock) query.stock = { $gt: 0 };

  const total = await Tray.countDocuments(query);

  let rawData: TrayDocument[];

  if (sortByStock) {
    const pipeline: PipelineStage[] = [
      { $match: query },
      { $addFields: { _hasStock: { $cond: [{ $gt: ['$stock', 0] }, 0, 1] } } },
      { $sort: { _hasStock: 1, name: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { _hasStock: 0 } },
    ];
    const aggResult = await Tray.aggregate(pipeline);
    rawData = aggResult.map((d) => Tray.hydrate(d)) as TrayDocument[];
  } else {
    rawData = (await Tray.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec()) as TrayDocument[];
  }

  const data = await Promise.all(
    rawData.map((t) => enrichTrayDoc(t)),
  );
  return { data, total };
}

export async function findTrayById(id: string): Promise<EnrichedTray> {
  const Tray = getTrayModel();
  const tray = await Tray.findById(id).exec();
  if (!tray) throw { status: 404, message: 'Bandeja no encontrada' };
  return enrichTrayDoc(tray as TrayDocument);
}

export async function createTray(dto: CreateTrayInput): Promise<EnrichedTray> {
  const Tray = getTrayModel();
  const Recipe = getRecipeModel();
  const existing = await Tray.findOne({
    name: { $regex: `^${dto.name}$`, $options: 'i' },
  }).exec();
  if (existing) {
    throw {
      status: 409,
      message: `Ya existe una bandeja con el nombre "${dto.name}"`,
    };
  }

  await findProfitRuleById(dto.profitRuleId);

  if (!dto.recipes || dto.recipes.length === 0) {
    throw { status: 400, message: 'La bandeja debe tener al menos una receta' };
  }

  const recipeIds = dto.recipes.map((r) => r.recipeId);
  const found = await Recipe.find({ _id: { $in: recipeIds } }).exec();
  if (found.length !== recipeIds.length) {
    throw { status: 404, message: 'Una o más recetas no existen' };
  }

  const tray = await Tray.create({
    name: dto.name,
    recipes: dto.recipes.map((r) => ({
      recipeId: new Types.ObjectId(r.recipeId),
      quantity: r.quantity,
    })),
    profitRuleId: new Types.ObjectId(dto.profitRuleId),
  });

  return enrichTrayDoc(tray as TrayDocument);
}

export async function updateTray(
  id: string,
  dto: UpdateTrayInput,
): Promise<EnrichedTray> {
  const Tray = getTrayModel();
  const Recipe = getRecipeModel();
  const tray = await Tray.findById(id).exec();
  if (!tray) throw { status: 404, message: 'Bandeja no encontrada' };

  if (dto.name && dto.name !== (tray as TrayDocument).name) {
    const existing = await Tray.findOne({
      name: { $regex: `^${dto.name}$`, $options: 'i' },
      _id: { $ne: id },
    }).exec();
    if (existing) {
      throw {
        status: 409,
        message: `Ya existe una bandeja con el nombre "${dto.name}"`,
      };
    }
  }

  const updates: Record<string, unknown> = {};
  if (dto.name) updates.name = dto.name;

  if (dto.profitRuleId) {
    await findProfitRuleById(dto.profitRuleId);
    updates.profitRuleId = new Types.ObjectId(dto.profitRuleId);
  }

  if (dto.recipes) {
    const recipeIds = dto.recipes.map((r) => r.recipeId);
    const found = await Recipe.find({ _id: { $in: recipeIds } }).exec();
    if (found.length !== recipeIds.length) {
      throw { status: 404, message: 'Una o más recetas no existen' };
    }
    updates.recipes = dto.recipes.map((r) => ({
      recipeId: new Types.ObjectId(r.recipeId),
      quantity: r.quantity,
    }));
    updates.customSellingPrice = null;
  }

  const updated = await Tray.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true },
  ).exec();
  if (!updated) throw { status: 404, message: 'Bandeja no encontrada' };
  return enrichTrayDoc(updated as TrayDocument);
}

export async function updateTrayPrice(
  id: string,
  dto: UpdateTrayPriceInput,
): Promise<EnrichedTray> {
  const Tray = getTrayModel();
  const updated = await Tray.findByIdAndUpdate(
    id,
    { $set: { customSellingPrice: dto.customSellingPrice } },
    { new: true },
  ).exec();
  if (!updated) throw { status: 404, message: 'Bandeja no encontrada' };
  return enrichTrayDoc(updated as TrayDocument);
}

export async function updateTrayStock(
  id: string,
  dto: { stock: number },
): Promise<EnrichedTray> {
  const Tray = getTrayModel();
  const updated = await Tray.findByIdAndUpdate(
    id,
    { $set: { stock: Math.max(0, dto.stock) } },
    { new: true },
  ).exec();
  if (!updated) throw { status: 404, message: 'Bandeja no encontrada' };
  return enrichTrayDoc(updated as TrayDocument);
}

export async function deleteTray(id: string): Promise<void> {
  const Tray = getTrayModel();
  const tray = await Tray.findById(id).exec();
  if (!tray) throw { status: 404, message: 'Bandeja no encontrada' };
  await Tray.findByIdAndDelete(id).exec();
}
