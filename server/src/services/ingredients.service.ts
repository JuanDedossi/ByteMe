import {
  getIngredientModel,
  IngredientDocument,
} from '../models/ingredient.model';
import { getPurchaseHistoryModel } from '../models/purchase-history.model';
import { getRecipeModel } from '../models/recipe.model';

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
  costPer100g?: number;
  costPerUnit?: number;
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
  const Ingredient = getIngredientModel();
  const PurchaseHistory = getPurchaseHistoryModel();
  const Recipe = getRecipeModel();
  const unit = dto.unit ?? 'kg';
  const isWeight = unit === 'kg';

  const costPerKg = isWeight
    ? (dto.pricePaid / dto.quantityPurchased) * 1000
    : 0;
  const costPer100g = isWeight ? costPerKg / 10 : 0;
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
    const realCostPer100g = realIsWeight ? realCostPerKg / 10 : 0;
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

    // Resetear customSellingPrice en recetas que usen este ingrediente
    await Recipe.updateMany(
      { 'ingredients.ingredientId': ingredient._id, customSellingPrice: { $ne: null } },
      { $set: { customSellingPrice: null } },
    ).exec();
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
  const Ingredient = getIngredientModel();
  const Recipe = getRecipeModel();
  if (dto.name) {
    const existing = await Ingredient.findOne({
      name: { $regex: `^${dto.name}$`, $options: 'i' },
      _id: { $ne: id },
    }).exec();
    if (existing) {
      throw {
        status: 409,
        message: `Ya existe un ingrediente con el nombre "${dto.name}"`,
      };
    }
  }

  const updates: Record<string, any> = {};
  if (dto.name) updates.name = dto.name;
  if (dto.unit) updates.unit = dto.unit;
  if (dto.costPerKg !== undefined) updates.costPerKg = dto.costPerKg;
  if (dto.costPer100g !== undefined) updates.costPer100g = dto.costPer100g;
  if (dto.costPerUnit !== undefined) updates.costPerUnit = dto.costPerUnit;

  const ingredient = (await Ingredient.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true },
  ).exec()) as IngredientDocument | null;
  if (!ingredient) {
    throw { status: 404, message: 'Ingrediente no encontrado' };
  }

  if (dto.costPerKg !== undefined || dto.costPerUnit !== undefined) {
    await Recipe.updateMany(
      { 'ingredients.ingredientId': ingredient._id, customSellingPrice: { $ne: null } },
      { $set: { customSellingPrice: null } },
    ).exec();
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
  return false;
}
