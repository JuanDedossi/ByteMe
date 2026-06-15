import { Types } from 'mongoose';
import {
  getIngredientModel,
  IngredientDocument,
} from '../models/ingredient.model';
import { getPurchaseHistoryModel } from '../models/purchase-history.model';
import { getRecipeModel } from '../models/recipe.model';
import { roundCurrency } from '../utils/currency';

export interface RegisterPurchaseInput {
  ingredientName: string;
  isNew?: boolean;
  ingredientId?: string;
  unit?: string;
  quantityPurchased: number;
  pricePaid: number;
}

export interface UpdateIngredientInput {
  name?: string;
  unit?: string;
  costPerKg?: number;
  costPerUnit?: number;
}

async function resetCustomSellingPriceCascade(seedId: string): Promise<void> {
  const Recipe = getRecipeModel();
  const visited = new Set<string>();
  let frontier = [seedId];

  while (frontier.length > 0) {
    // DESTRUCTIVE: see design.md Phase 4
    const docs = await Recipe.find({
      $or: [
        { 'ingredients.ingredientId': { $in: frontier.map((id) => new Types.ObjectId(id)) } },
        { 'ingredients.recipeId': { $in: frontier.map((id) => new Types.ObjectId(id)) } },
      ],
    }).lean();

    const next = docs
      .map((d: any) => d._id.toString())
      .filter((id) => !visited.has(id));
    if (next.length === 0) break;
    next.forEach((id) => visited.add(id));
    frontier = next;
  }

  if (visited.size > 0) {
    const result = await Recipe.updateMany(
      {
        _id: { $in: [...visited].map((id) => new Types.ObjectId(id)) },
        customSellingPrice: { $ne: null },
      },
      { $set: { customSellingPrice: null } },
    );
    if (result.modifiedCount && result.modifiedCount > 0) {
      console.log(
        `Cascade reset customSellingPrice for recipes: ${[...visited].join(', ')}`,
      );
    }
  }
}

function deriveCostPer100g(unit: string, costPerKg: number): number {
  return unit === 'kg' ? roundCurrency(costPerKg / 10) : 0;
}

export async function findAllIngredients(
  page = 1,
  limit = 10,
  search?: string,
): Promise<{ data: IngredientDocument[]; total: number }> {
  const Ingredient = getIngredientModel();
  const query = search ? { name: { $regex: search, $options: 'i' } } : {};

  const [data, total] = await Promise.all([
    Ingredient.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
    Ingredient.countDocuments(query),
  ]);

  return { data: data as IngredientDocument[], total };
}

export async function findIngredientById(
  id: string,
): Promise<IngredientDocument> {
  const Ingredient = getIngredientModel();
  const ingredient = await Ingredient.findById(id).exec();
  if (!ingredient) {
    throw { status: 404, message: 'Ingrediente no encontrado' };
  }
  return ingredient as IngredientDocument;
}

export async function findIngredientsByIds(
  ids: string[],
): Promise<IngredientDocument[]> {
  const Ingredient = getIngredientModel();
  const result = await Ingredient.find({ _id: { $in: ids } }).exec();
  return result as IngredientDocument[];
}

export async function registerPurchase(
  dto: RegisterPurchaseInput,
): Promise<IngredientDocument> {
  if (dto.quantityPurchased <= 0) {
    throw { status: 400, message: 'La cantidad comprada debe ser mayor a 0' };
  }
  if (dto.pricePaid < 0) {
    throw { status: 400, message: 'El precio pagado no puede ser negativo' };
  }

  const Ingredient = getIngredientModel();
  const PurchaseHistory = getPurchaseHistoryModel();
  const unit = dto.unit ?? 'kg';
  const isWeight = unit === 'kg';

  const costPerKg = isWeight
    ? (dto.pricePaid / dto.quantityPurchased) * 1000
    : 0;
  const costPer100g = deriveCostPer100g(unit, costPerKg);
  const costPerUnit = !isWeight
    ? dto.pricePaid / dto.quantityPurchased
    : 0;

  let ingredient: IngredientDocument | null = null;

  if (dto.isNew || !dto.ingredientId) {
    const existing = await Ingredient.findOne({
      name: { $regex: `^${dto.ingredientName}$`, $options: 'i' },
    }).exec();
    if (existing) {
      throw {
        status: 409,
        message: `Ya existe un ingrediente con el nombre "${dto.ingredientName}"`,
      };
    }
    ingredient = (await Ingredient.create({
      name: dto.ingredientName,
      unit,
      costPerKg,
      costPer100g,
      costPerUnit,
    })) as IngredientDocument;
  } else {
    // Obtener la unidad real del ingrediente desde la DB (el cliente no la envía)
    const existing = await Ingredient.findById(dto.ingredientId).exec() as IngredientDocument | null;
    if (!existing) throw { status: 404, message: 'Ingrediente no encontrado' };

    const realIsWeight = existing.unit === 'kg';
    const realCostPerKg = realIsWeight ? (dto.pricePaid / dto.quantityPurchased) * 1000 : 0;
    const realCostPer100g = deriveCostPer100g(existing.unit, realCostPerKg);
    const realCostPerUnit = !realIsWeight ? dto.pricePaid / dto.quantityPurchased : 0;

    const updateFields: Record<string, number> = realIsWeight
      ? { costPerKg: realCostPerKg, costPer100g: realCostPer100g }
      : { costPerUnit: realCostPerUnit };

    ingredient = (await Ingredient.findByIdAndUpdate(
      dto.ingredientId,
      updateFields,
      { new: true },
    ).exec()) as IngredientDocument | null;
    if (!ingredient) {
      throw { status: 404, message: 'Ingrediente no encontrado' };
    }

    await resetCustomSellingPriceCascade(ingredient._id.toString());
  }

  const finalUnit = ingredient.unit;
  const finalIsWeight = finalUnit === 'kg';

  await PurchaseHistory.create({
    ingredientId: ingredient._id,
    ingredientName: ingredient.name,
    unit: finalUnit,
    quantityPurchased: dto.quantityPurchased,
    pricePaid: dto.pricePaid,
    costPerKgAtPurchase: finalIsWeight ? (dto.pricePaid / dto.quantityPurchased) * 1000 : undefined,
    costPerUnitAtPurchase: !finalIsWeight ? dto.pricePaid / dto.quantityPurchased : undefined,
  });

  return ingredient;
}

export async function updateIngredient(
  id: string,
  dto: UpdateIngredientInput,
): Promise<IngredientDocument> {
  if (dto.costPerKg !== undefined && dto.costPerKg < 0) {
    throw { status: 400, message: 'El costo por kg no puede ser negativo' };
  }
  if (dto.costPerUnit !== undefined && dto.costPerUnit < 0) {
    throw { status: 400, message: 'El costo por unidad no puede ser negativo' };
  }

  const Ingredient = getIngredientModel();

  const existing = await Ingredient.findById(id).exec() as IngredientDocument | null;
  if (!existing) {
    throw { status: 404, message: 'Ingrediente no encontrado' };
  }

  if (dto.name && dto.name !== existing.name) {
    const nameConflict = await Ingredient.findOne({
      name: { $regex: `^${dto.name}$`, $options: 'i' },
      _id: { $ne: id },
    }).exec();
    if (nameConflict) {
      throw {
        status: 409,
        message: `Ya existe un ingrediente con el nombre "${dto.name}"`,
      };
    }
  }

  const updates: Record<string, unknown> = {};
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.unit !== undefined) updates.unit = dto.unit;
  if (dto.costPerKg !== undefined) updates.costPerKg = dto.costPerKg;
  if (dto.costPerUnit !== undefined) updates.costPerUnit = dto.costPerUnit;

  const finalUnit = (updates.unit as string | undefined) ?? existing.unit;
  const finalCostPerKg =
    (updates.costPerKg as number | undefined) ?? existing.costPerKg;
  updates.costPer100g = deriveCostPer100g(finalUnit, finalCostPerKg);

  const ingredient = (await Ingredient.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true },
  ).exec()) as IngredientDocument | null;
  if (!ingredient) {
    throw { status: 404, message: 'Ingrediente no encontrado' };
  }

  if (dto.costPerKg !== undefined || dto.costPerUnit !== undefined) {
    await resetCustomSellingPriceCascade(ingredient._id.toString());
  }

  return ingredient;
}

export async function deleteIngredient(id: string): Promise<void> {
  const Ingredient = getIngredientModel();
  const ingredient = await Ingredient.findById(id).exec();
  if (!ingredient) {
    throw { status: 404, message: 'Ingrediente no encontrado' };
  }
  await Ingredient.deleteOne({ _id: id }).exec();
}

export async function checkIngredientInUse(_id: string): Promise<boolean> {
  const Recipe = getRecipeModel();
  const count = await Recipe.countDocuments({
    'ingredients.ingredientId': new Types.ObjectId(_id),
    isActive: true,
  }).exec();
  return count > 0;
}
