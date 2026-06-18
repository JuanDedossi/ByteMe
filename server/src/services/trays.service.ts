import { Types, PipelineStage } from 'mongoose';
import { getTrayModel, TrayDocument } from '../models/tray.model';
import { getRecipeModel } from '../models/recipe.model';
import { findProfitRuleById } from './profit-rules.service';
import { findRecipeById } from './recipes.service';
import { findComplementsByIds, validateComplementQuantities } from './complements.service';
import { roundCurrency } from '../utils/currency';
import {
  calculateTrayCost,
  SubRecipeCostContext,
} from '../utils/cost-calculator';
import type { ComplementDocument } from '../models/complement.model';

export interface EnrichedTrayComplement {
  complementId: string;
  complementName: string;
  unit: string;
  quantity: number;
  cost: number;
}

export interface EnrichedTrayRecipe {
  recipeId: string;
  recipeName: string;
  recipeSellUnit: string;
  recipeYieldUnits: number;
  recipeYieldGrams: number;
  quantity: number;
  // Per-recipe cost contribution inside the tray, computed from
  // recipe.costBase (never costTotal).
  cost: number;
}

export interface EnrichedTray {
  _id: Types.ObjectId;
  name: string;
  recipes: EnrichedTrayRecipe[];
  complements: EnrichedTrayComplement[];
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
  complements?: { complementId: string; quantity: number }[];
  profitRuleId: string;
}

export interface UpdateTrayInput {
  name?: string;
  recipes?: { recipeId: string; quantity: number }[];
  complements?: { complementId: string; quantity: number }[];
  profitRuleId?: string;
}

export interface UpdateTrayPriceInput {
  customSellingPrice: number | null;
}

async function enrichTrayDoc(tray: TrayDocument): Promise<EnrichedTray> {
  const recipeIds = [...new Set(tray.recipes.map((r) => r.recipeId.toString()))];
  const complementIds = [
    ...new Set(
      (tray.complements ?? []).map((c) => c.complementId.toString()),
    ),
  ];

  const [enrichedRecipes, complements] = await Promise.all([
    Promise.all(recipeIds.map((id) => findRecipeById(id))),
    complementIds.length > 0
      ? findComplementsByIds(complementIds)
      : Promise.resolve([] as ComplementDocument[]),
    findProfitRuleById(tray.profitRuleId.toString()),
  ]);

  const enrichedRecipeMap = new Map(
    enrichedRecipes.map((r) => [r._id.toString(), r]),
  );
  const complementMap = new Map(
    complements.map((c) => [c._id.toString(), c]),
  );

  const subCostContext = new Map<string, SubRecipeCostContext>();
  for (const [id, r] of enrichedRecipeMap) {
    subCostContext.set(id, {
      costBase: r.costBase,
      sellUnit: r.sellUnit,
      yieldGrams: r.yieldGrams,
      yieldUnits: r.yieldUnits,
    });
  }

  const totalCost = calculateTrayCost(tray, subCostContext, complementMap);

  const recipes: EnrichedTrayRecipe[] = tray.recipes.map((tr) => {
    const recipe = enrichedRecipeMap.get(tr.recipeId.toString());
    let cost = 0;
    if (recipe) {
      // Use recipe.costBase (NOT costTotal) so sub-recipe complements do
      // not double-count at the tray level.
      if (recipe.sellUnit === 'kg' && recipe.yieldGrams > 0) {
        cost = (recipe.costBase / recipe.yieldGrams) * tr.quantity;
      } else {
        cost = (recipe.costBase / (recipe.yieldUnits || 1)) * tr.quantity;
      }
    }
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

  const enrichedComplements: EnrichedTrayComplement[] = (tray.complements ?? []).map(
    (c) => {
      const comp = complementMap.get(c.complementId.toString());
      const cost = comp ? comp.costPerUnit * c.quantity : 0;
      return {
        complementId: c.complementId.toString(),
        complementName: comp?.name ?? 'Complemento desconocido',
        unit: comp?.unit ?? 'unidad',
        quantity: c.quantity,
        cost,
      };
    },
  );

  const rule = await findProfitRuleById(tray.profitRuleId.toString());
  const markupPercentage = rule.markupPercentage;
  const customSellingPrice: number | null =
    (tray as any).customSellingPrice ?? null;

  let sellingPrice: number;
  if (customSellingPrice !== null) {
    sellingPrice = customSellingPrice;
  } else {
    sellingPrice = totalCost * (1 + markupPercentage / 100);
  }

  const obj = (tray as any).toObject();

  return {
    ...obj,
    recipes,
    complements: enrichedComplements,
    cost: totalCost,
    profitRuleName: rule.name,
    markupPercentage,
    sellingPrice: roundCurrency(sellingPrice),
    customSellingPrice:
      customSellingPrice !== null
        ? roundCurrency(customSellingPrice)
        : null,
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

  const data = await Promise.all(rawData.map((t) => enrichTrayDoc(t)));
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

  if (dto.complements && dto.complements.length > 0) {
    const foundComps = await findComplementsByIds(
      dto.complements.map((c) => c.complementId),
    );
    if (foundComps.length !== dto.complements.length) {
      throw { status: 404, message: 'Uno o más complementos no existen' };
    }
    // REQ-CMP-7 / REQ-TRA-15: unit-aware quantity validation.
    const complementMap = new Map(foundComps.map((c) => [c._id.toString(), c]));
    validateComplementQuantities(dto.complements, complementMap);
  }

  const tray = await Tray.create({
    name: dto.name,
    recipes: dto.recipes.map((r) => ({
      recipeId: new Types.ObjectId(r.recipeId),
      quantity: r.quantity,
    })),
    complements: (dto.complements ?? []).map((c) => ({
      complementId: new Types.ObjectId(c.complementId),
      quantity: c.quantity,
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

  if (dto.recipes !== undefined && dto.recipes.length === 0) {
    throw { status: 400, message: 'tray must have at least one recipe' };
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

  if (dto.complements !== undefined) {
    const complementItems = dto.complements ?? [];
    if (complementItems.length > 0) {
      const foundComps = await findComplementsByIds(
        complementItems.map((c) => c.complementId),
      );
      if (foundComps.length !== complementItems.length) {
        throw { status: 404, message: 'Uno o más complementos no existen' };
      }
      // REQ-CMP-7 / REQ-TRA-15: unit-aware quantity validation.
      const complementMap = new Map(foundComps.map((c) => [c._id.toString(), c]));
      validateComplementQuantities(complementItems, complementMap);
    }
    updates.complements = complementItems.map((c) => ({
      complementId: new Types.ObjectId(c.complementId),
      quantity: c.quantity,
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
    {
      $set: {
        customSellingPrice:
          dto.customSellingPrice !== null
            ? roundCurrency(dto.customSellingPrice)
            : null,
      },
    },
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
