import { Types, PipelineStage } from 'mongoose';
import { getRecipeModel, RecipeDocument } from '../models/recipe.model';
import { findIngredientsByIds } from './ingredients.service';
import { findProfitRuleById } from './profit-rules.service';
import {
  findComplementsByIds,
  validateComplementQuantities,
} from './complements.service';
import { roundCurrency } from '../utils/currency';
import {
  calculateRecipeCost,
  SubRecipeCostContext,
} from '../utils/cost-calculator';
import type { IngredientDocument } from '../models/ingredient.model';
import type { ComplementDocument } from '../models/complement.model';

export interface EnrichedRecipe {
  _id: Types.ObjectId;
  name: string;
  ingredients: {
    ingredientId: string;
    ingredientName: string;
    ingredientUnit: string;
    quantity: number;
    cost: number;
    isSubRecipe?: boolean;
  }[];
  complements: {
    complementId: string;
    complementName: string;
    unit: string;
    quantity: number;
    cost: number;
  }[];
  // Backward-compatible alias for the recipe's cost (no complements).
  // Kept so the existing client "Costo producción" line keeps working.
  cost: number;
  // New: ingredients + sub-recipe costBase (no own complements).
  costBase: number;
  // New: costBase + own complements.
  costTotal: number;
  profitRuleId: Types.ObjectId;
  profitRuleName: string;
  markupPercentage: number;
  sellingPrice: number;
  sellUnit: string;
  yieldGrams: number;
  yieldUnits: number;
  customSellingPrice: number | null;
  pricePerKg: number;
  pricePer100g: number;
  stock: number;
  isActive: boolean;
  isSubRecipe: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecipeInput {
  name: string;
  ingredients: { ingredientId: string; quantity: number }[];
  subRecipes?: { recipeId: string; quantity: number }[];
  complements?: { complementId: string; quantity: number }[];
  profitRuleId: string;
  sellUnit?: string;
  yieldGrams?: number;
  yieldUnits?: number;
  isSubRecipe?: boolean;
}

export interface UpdateRecipeInput {
  name?: string;
  ingredients?: { ingredientId: string; quantity: number }[];
  subRecipes?: { recipeId: string; quantity: number }[];
  complements?: { complementId: string; quantity: number }[];
  profitRuleId?: string;
  sellUnit?: string;
  yieldGrams?: number;
  yieldUnits?: number;
  isSubRecipe?: boolean;
}

export interface UpdateRecipePriceInput {
  customSellingPrice: number | null;
}

export interface UpdateStockInput {
  stock: number;
}

const MAX_SUB_RECIPE_DEPTH = 10;

function validateKgYield(sellUnit: string, yieldGrams?: number): void {
  if (sellUnit === 'kg' && (yieldGrams === undefined || yieldGrams <= 0)) {
    throw {
      status: 400,
      message: 'yieldGrams must be > 0 when sellUnit is kg',
    };
  }
}

async function enrichRecipes(
  recipes: RecipeDocument[],
  depth = 0,
  visited = new Set<string>(),
): Promise<EnrichedRecipe[]> {
  if (recipes.length === 0) return [];

  const ingredientIds = [
    ...new Set(
      recipes.flatMap((r) =>
        r.ingredients
          .filter(
            (i) =>
              ((i as any).type ?? 'ingredient') === 'ingredient' &&
              i.ingredientId,
          )
          .map((i) => i.ingredientId!.toString()),
      ),
    ),
  ];

  const complementIds = [
    ...new Set(
      recipes.flatMap((r) =>
        (r.complements ?? []).map((c) => c.complementId.toString()),
      ),
    ),
  ];

  const ruleIds = [...new Set(recipes.map((r) => r.profitRuleId.toString()))];

  const [ingredients, complements, ruleResults] = await Promise.all([
    ingredientIds.length > 0
      ? findIngredientsByIds(ingredientIds)
      : Promise.resolve([] as IngredientDocument[]),
    complementIds.length > 0
      ? findComplementsByIds(complementIds)
      : Promise.resolve([] as ComplementDocument[]),
    Promise.all(ruleIds.map((id) => findProfitRuleById(id))),
  ]);

  const ingredientMap = new Map(ingredients.map((i) => [i._id.toString(), i]));
  const complementMap = new Map(complements.map((c) => [c._id.toString(), c]));
  const ruleMap = new Map(ruleResults.map((r) => [r._id.toString(), r]));

  const Recipe = getRecipeModel();

  return Promise.all(
    recipes.map(async (recipe) => {
      const rule = ruleMap.get(recipe.profitRuleId.toString());
      if (!rule) {
        throw { status: 404, message: 'Profit rule not found' };
      }
      const markupPercentage = rule.markupPercentage;

      const branchVisited = new Set(visited);
      branchVisited.add(recipe._id.toString());

      const subRecipeIds = [
        ...new Set(
          recipe.ingredients
            .filter(
              (i) => (i as any).type === 'subRecipe' && (i as any).recipeId,
            )
            .map((i) => (i as any).recipeId.toString()),
        ),
      ];

      let subRecipeMap = new Map<string, EnrichedRecipe>();
      if (depth < MAX_SUB_RECIPE_DEPTH && subRecipeIds.length > 0) {
        const notVisitedIds = subRecipeIds.filter(
          (id) => !branchVisited.has(id),
        );
        const subRawRecipes = await Recipe.find({
          _id: { $in: notVisitedIds },
        }).exec();
        const enrichedSubs = await enrichRecipes(
          subRawRecipes as RecipeDocument[],
          depth + 1,
          branchVisited,
        );
        subRecipeMap = new Map(enrichedSubs.map((r) => [r._id.toString(), r]));
      }

      // Build sub-recipe context (only costBase, sellUnit, yieldGrams, yieldUnits
      // are needed for the parent's cost calculation).
      const subCostContext = new Map<string, SubRecipeCostContext>();
      for (const [id, sub] of subRecipeMap) {
        subCostContext.set(id, {
          costBase: sub.costBase,
          sellUnit: sub.sellUnit,
          yieldGrams: sub.yieldGrams,
          yieldUnits: sub.yieldUnits,
        });
      }

      const { costBase, costTotal } = calculateRecipeCost(
        recipe,
        ingredientMap,
        subCostContext,
        complementMap,
      );

      const enrichedIngredients = recipe.ingredients.map((ri) => {
        const itemType = (ri as any).type ?? 'ingredient';

        if (itemType === 'subRecipe') {
          const recipeId = (ri as any).recipeId?.toString() ?? '';
          const sub = subRecipeMap.get(recipeId);
          // Sub-recipe contribution always uses sub.costBase (never costTotal).
          let cost = 0;
          if (sub) {
            if (sub.sellUnit === 'kg' && sub.yieldGrams > 0) {
              cost = (sub.costBase / sub.yieldGrams) * ri.quantity;
            } else {
              cost = (sub.costBase / (sub.yieldUnits || 1)) * ri.quantity;
            }
          }
          return {
            ingredientId: recipeId,
            ingredientName: sub?.name ?? 'Sub-receta desconocida',
            ingredientUnit: sub?.sellUnit === 'kg' ? 'g' : 'u.',
            quantity: ri.quantity,
            cost,
            isSubRecipe: true,
          };
        }

        const ing = ingredientMap.get(ri.ingredientId!.toString());
        let cost = 0;
        if (ing) {
          cost =
            ing.unit === 'unidad'
              ? ing.costPerUnit * ri.quantity
              : (ing.costPerKg * ri.quantity) / 1000;
        }
        return {
          ingredientId: ri.ingredientId!.toString(),
          ingredientName: ing?.name ?? 'Desconocido',
          ingredientUnit: ing?.unit ?? 'kg',
          quantity: ri.quantity,
          cost,
          isSubRecipe: false,
        };
      });

      const enrichedComplements = (recipe.complements ?? []).map((c) => {
        const comp = complementMap.get(c.complementId.toString());
        const cost = comp ? comp.costPerUnit * c.quantity : 0;
        return {
          complementId: c.complementId.toString(),
          complementName: comp?.name ?? 'Complemento desconocido',
          unit: comp?.unit ?? 'unidad',
          quantity: c.quantity,
          cost,
        };
      });

      const sellUnit = recipe.sellUnit ?? 'unidad';
      const yieldGrams = recipe.yieldGrams ?? 0;
      const yieldUnits = (recipe as any).yieldUnits ?? 1;
      const customSellingPrice: number | null =
        (recipe as any).customSellingPrice ?? null;
      const isSubRecipe = (recipe as any).isSubRecipe ?? false;

      let sellingPrice: number;
      let pricePerKg = 0;

      if (customSellingPrice !== null) {
        sellingPrice = customSellingPrice;
        if (sellUnit === 'kg') pricePerKg = customSellingPrice;
      } else if (sellUnit === 'kg' && yieldGrams > 0) {
        const costPerKg = (costTotal / yieldGrams) * 1000;
        pricePerKg = costPerKg * (1 + markupPercentage / 100);
        sellingPrice = pricePerKg;
      } else {
        sellingPrice = (costTotal * (1 + markupPercentage / 100)) / yieldUnits;
      }

      const obj = (recipe as any).toObject();

      const pricePer100g =
        sellUnit === 'kg' ? roundCurrency(pricePerKg / 10) : 0;

      return {
        ...obj,
        ingredients: enrichedIngredients,
        complements: enrichedComplements,
        // Backward-compatible: `cost` continues to mean the recipe's
        // ingredient+sub-recipe cost (no own complements).
        cost: costBase,
        costBase,
        costTotal,
        profitRuleName: rule.name,
        markupPercentage,
        sellingPrice: roundCurrency(sellingPrice),
        sellUnit,
        yieldGrams,
        yieldUnits,
        customSellingPrice:
          customSellingPrice !== null
            ? roundCurrency(customSellingPrice)
            : null,
        pricePerKg: roundCurrency(pricePerKg),
        pricePer100g,
        isSubRecipe,
      };
    }),
  );
}

async function enrichRecipe(recipe: RecipeDocument): Promise<EnrichedRecipe> {
  const [result] = await enrichRecipes([recipe]);
  return result;
}

export async function findAllRecipes(
  page = 1,
  limit = 10,
  search?: string,
  isSubRecipe?: boolean,
  sortByStock = false,
  hasStock?: boolean,
): Promise<{ data: EnrichedRecipe[]; total: number }> {
  const Recipe = getRecipeModel();
  const query: Record<string, unknown> = {};
  if (search) query.name = { $regex: search, $options: 'i' };
  if (isSubRecipe !== undefined) query.isSubRecipe = isSubRecipe;
  if (hasStock) query.stock = { $gt: 0 };

  const total = await Recipe.countDocuments(query);

  let rawData: RecipeDocument[];

  if (sortByStock) {
    const pipeline: PipelineStage[] = [
      { $match: query },
      { $addFields: { _hasStock: { $cond: [{ $gt: ['$stock', 0] }, 0, 1] } } },
      { $sort: { _hasStock: 1, name: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { _hasStock: 0 } },
    ];
    const aggResult = await Recipe.aggregate(pipeline);
    rawData = aggResult.map((d) => Recipe.hydrate(d)) as RecipeDocument[];
  } else {
    rawData = (await Recipe.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec()) as RecipeDocument[];
  }

  const data = await enrichRecipes(rawData);
  return { data, total };
}

export async function findRecipeById(id: string): Promise<EnrichedRecipe> {
  const Recipe = getRecipeModel();
  const recipe = await Recipe.findById(id).exec();
  if (!recipe) {
    throw { status: 404, message: 'Receta no encontrada' };
  }
  return enrichRecipe(recipe as RecipeDocument);
}

export async function createRecipe(
  dto: CreateRecipeInput,
): Promise<EnrichedRecipe> {
  const Recipe = getRecipeModel();
  const existing = await Recipe.findOne({
    name: { $regex: `^${dto.name}$`, $options: 'i' },
  }).exec();
  if (existing) {
    throw {
      status: 409,
      message: `Ya existe una receta con el nombre "${dto.name}"`,
    };
  }

  await findProfitRuleById(dto.profitRuleId);
  const found = await findIngredientsByIds(
    dto.ingredients.map((i) => i.ingredientId),
  );
  if (found.length !== dto.ingredients.length) {
    throw { status: 404, message: 'Uno o más ingredientes no existen' };
  }

  if (dto.complements && dto.complements.length > 0) {
    const foundComps = await findComplementsByIds(
      dto.complements.map((c) => c.complementId),
    );
    if (foundComps.length !== dto.complements.length) {
      throw { status: 404, message: 'Uno o más complementos no existen' };
    }
    // REQ-CMP-7 / REQ-REC-17: unit-aware quantity validation.
    const complementMap = new Map(foundComps.map((c) => [c._id.toString(), c]));
    validateComplementQuantities(dto.complements, complementMap);
  }

  const sellUnit = dto.sellUnit ?? 'unidad';
  validateKgYield(sellUnit, dto.yieldGrams);

  const combinedIngredients = [
    ...dto.ingredients.map((i) => ({
      type: 'ingredient' as const,
      ingredientId: new Types.ObjectId(i.ingredientId),
      quantity: i.quantity,
    })),
    ...(dto.subRecipes ?? []).map((sr) => ({
      type: 'subRecipe' as const,
      recipeId: new Types.ObjectId(sr.recipeId),
      quantity: sr.quantity,
    })),
  ];

  const recipe = await Recipe.create({
    name: dto.name,
    ingredients: combinedIngredients,
    complements: (dto.complements ?? []).map((c) => ({
      complementId: new Types.ObjectId(c.complementId),
      quantity: c.quantity,
    })),
    profitRuleId: new Types.ObjectId(dto.profitRuleId),
    sellUnit,
    yieldGrams: dto.yieldGrams,
    yieldUnits: dto.yieldUnits ?? 1,
    isSubRecipe: dto.isSubRecipe ?? false,
  });

  return enrichRecipe(recipe as RecipeDocument);
}

export async function updateRecipe(
  id: string,
  dto: UpdateRecipeInput,
): Promise<EnrichedRecipe> {
  const Recipe = getRecipeModel();
  const recipe = await Recipe.findById(id).exec();
  if (!recipe) throw { status: 404, message: 'Receta no encontrada' };

  if (dto.name && dto.name !== (recipe as RecipeDocument).name) {
    const existing = await Recipe.findOne({
      name: { $regex: `^${dto.name}$`, $options: 'i' },
      _id: { $ne: id },
    }).exec();
    if (existing) {
      throw {
        status: 409,
        message: `Ya existe una receta con el nombre "${dto.name}"`,
      };
    }
  }

  const updates: Record<string, unknown> = {};
  if (dto.name) updates.name = dto.name;

  if (dto.profitRuleId) {
    await findProfitRuleById(dto.profitRuleId);
    updates.profitRuleId = new Types.ObjectId(dto.profitRuleId);
  }

  const hasIngredientChanges =
    dto.ingredients !== undefined || dto.subRecipes !== undefined;
  const hasComplementChanges = dto.complements !== undefined;

  if (hasIngredientChanges) {
    const ingredientItems = dto.ingredients ?? [];
    const subRecipeItems = dto.subRecipes ?? [];

    if (ingredientItems.length > 0) {
      const found = await findIngredientsByIds(
        ingredientItems.map((i) => i.ingredientId),
      );
      if (found.length !== ingredientItems.length) {
        throw { status: 404, message: 'Uno o más ingredientes no existen' };
      }
    }

    updates.ingredients = [
      ...ingredientItems.map((i) => ({
        type: 'ingredient',
        ingredientId: new Types.ObjectId(i.ingredientId),
        quantity: i.quantity,
      })),
      ...subRecipeItems.map((sr) => ({
        type: 'subRecipe',
        recipeId: new Types.ObjectId(sr.recipeId),
        quantity: sr.quantity,
      })),
    ];
    updates.customSellingPrice = null;
  }

  if (hasComplementChanges) {
    const complementItems = dto.complements ?? [];
    if (complementItems.length > 0) {
      const foundComps = await findComplementsByIds(
        complementItems.map((c) => c.complementId),
      );
      if (foundComps.length !== complementItems.length) {
        throw { status: 404, message: 'Uno o más complementos no existen' };
      }
      // REQ-CMP-7 / REQ-REC-17: unit-aware quantity validation.
      const complementMap = new Map(
        foundComps.map((c) => [c._id.toString(), c]),
      );
      validateComplementQuantities(complementItems, complementMap);
    }
    updates.complements = complementItems.map((c) => ({
      complementId: new Types.ObjectId(c.complementId),
      quantity: c.quantity,
    }));
    updates.customSellingPrice = null;
  }

  if (dto.isSubRecipe !== undefined) updates.isSubRecipe = dto.isSubRecipe;
  if (dto.sellUnit !== undefined) updates.sellUnit = dto.sellUnit;
  if (dto.yieldGrams !== undefined) updates.yieldGrams = dto.yieldGrams;
  if (dto.yieldUnits !== undefined) updates.yieldUnits = dto.yieldUnits;

  const effectiveSellUnit =
    (updates.sellUnit as string | undefined) ?? recipe.sellUnit;
  const effectiveYieldGrams =
    (updates.yieldGrams as number | undefined) ?? recipe.yieldGrams;
  validateKgYield(effectiveSellUnit, effectiveYieldGrams);

  const updated = await Recipe.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true },
  ).exec();
  if (!updated) throw { status: 404, message: 'Receta no encontrada' };
  return enrichRecipe(updated as RecipeDocument);
}

export async function updateRecipePrice(
  id: string,
  dto: UpdateRecipePriceInput,
): Promise<EnrichedRecipe> {
  const Recipe = getRecipeModel();
  const updated = await Recipe.findByIdAndUpdate(
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
  if (!updated) throw { status: 404, message: 'Receta no encontrada' };
  return enrichRecipe(updated as RecipeDocument);
}

export async function updateRecipeStock(
  id: string,
  dto: UpdateStockInput,
): Promise<EnrichedRecipe> {
  const Recipe = getRecipeModel();
  const updated = await Recipe.findByIdAndUpdate(
    id,
    { $set: { stock: Math.max(0, dto.stock) } },
    { new: true },
  ).exec();
  if (!updated) throw { status: 404, message: 'Receta no encontrada' };
  return enrichRecipe(updated as RecipeDocument);
}

export async function deleteRecipe(id: string): Promise<void> {
  const Recipe = getRecipeModel();
  const recipe = await Recipe.findById(id).exec();
  if (!recipe) throw { status: 404, message: 'Receta no encontrada' };
  await Recipe.findByIdAndDelete(id).exec();
}

export async function toggleRecipeActive(id: string): Promise<EnrichedRecipe> {
  const Recipe = getRecipeModel();
  const recipe = (await Recipe.findById(id).exec()) as RecipeDocument | null;
  if (!recipe) throw { status: 404, message: 'Receta no encontrada' };
  const updated = await Recipe.findByIdAndUpdate(
    id,
    { $set: { isActive: !recipe.isActive } },
    { new: true },
  ).exec();
  if (!updated) throw { status: 404, message: 'Receta no encontrada' };
  return enrichRecipe(updated as RecipeDocument);
}
