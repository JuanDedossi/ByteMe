import { Types } from 'mongoose';
import {
  getComplementModel,
  ComplementDocument,
  ComplementUnit,
} from '../models/complement.model';
import { getRecipeModel } from '../models/recipe.model';
import { getTrayModel } from '../models/tray.model';

export interface CreateComplementInput {
  name: string;
  unit: ComplementUnit;
  costPerUnit: number;
}

export interface UpdateComplementInput {
  name?: string;
  unit?: ComplementUnit;
  costPerUnit?: number;
}

export interface ComplementWithUsage extends ComplementDocument {
  usageCount: number;
}

export async function findAllComplements(
  page = 1,
  limit = 10,
  search?: string,
  isActive?: boolean,
): Promise<{ data: ComplementWithUsage[]; total: number }> {
  const Complement = getComplementModel();
  const Recipe = getRecipeModel();
  const Tray = getTrayModel();

  const query: Record<string, unknown> = {};
  if (search) query.name = { $regex: search, $options: 'i' };
  if (isActive !== undefined) query.isActive = isActive;

  const [docs, total] = await Promise.all([
    Complement.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
    Complement.countDocuments(query),
  ]);

  // Count usage across recipes and trays in a single pass per collection.
  const ids = docs.map((d) => d._id);
  const usageCounts = await getComplementUsageCounts(ids);

  const data: ComplementWithUsage[] = (docs as ComplementDocument[]).map(
    (d) => {
      const doc = d as ComplementWithUsage;
      doc.usageCount = usageCounts.get(d._id.toString()) ?? 0;
      return doc;
    },
  );

  return { data, total };
}

export async function findComplementById(
  id: string,
): Promise<ComplementDocument> {
  const Complement = getComplementModel();
  const complement = await Complement.findById(id).exec();
  if (!complement) {
    throw { status: 404, message: 'Complemento no encontrado' };
  }
  return complement as ComplementDocument;
}

export async function findComplementsByIds(
  ids: string[],
): Promise<ComplementDocument[]> {
  if (ids.length === 0) return [];
  const Complement = getComplementModel();
  const result = await Complement.find({ _id: { $in: ids } }).exec();
  return result as ComplementDocument[];
}

export async function createComplement(
  dto: CreateComplementInput,
): Promise<ComplementDocument> {
  if (dto.costPerUnit < 0) {
    throw {
      status: 400,
      message: 'El costo por unidad no puede ser negativo',
    };
  }

  const Complement = getComplementModel();
  const existing = await Complement.findOne({
    name: { $regex: `^${dto.name}$`, $options: 'i' },
  }).exec();
  if (existing) {
    throw {
      status: 409,
      message: `Ya existe un complemento con el nombre "${dto.name}"`,
    };
  }

  const complement = (await Complement.create({
    name: dto.name,
    unit: dto.unit,
    costPerUnit: dto.costPerUnit,
  })) as ComplementDocument;
  return complement;
}

export async function updateComplement(
  id: string,
  dto: UpdateComplementInput,
): Promise<ComplementDocument> {
  if (dto.costPerUnit !== undefined && dto.costPerUnit < 0) {
    throw {
      status: 400,
      message: 'El costo por unidad no puede ser negativo',
    };
  }

  const Complement = getComplementModel();
  const existing = (await Complement.findById(id).exec()) as
    | ComplementDocument
    | null;
  if (!existing) {
    throw { status: 404, message: 'Complemento no encontrado' };
  }

  if (dto.name && dto.name !== existing.name) {
    const nameConflict = await Complement.findOne({
      name: { $regex: `^${dto.name}$`, $options: 'i' },
      _id: { $ne: id },
    }).exec();
    if (nameConflict) {
      throw {
        status: 409,
        message: `Ya existe un complemento con el nombre "${dto.name}"`,
      };
    }
  }

  const updates: Record<string, unknown> = {};
  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.unit !== undefined) updates.unit = dto.unit;
  if (dto.costPerUnit !== undefined) updates.costPerUnit = dto.costPerUnit;

  const complement = (await Complement.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true },
  ).exec()) as ComplementDocument | null;
  if (!complement) {
    throw { status: 404, message: 'Complemento no encontrado' };
  }

  if (dto.costPerUnit !== undefined) {
    await cascadeResetCustomSellingPrice(complement._id.toString());
  }

  return complement;
}

export async function toggleComplementActive(
  id: string,
): Promise<ComplementDocument> {
  const Complement = getComplementModel();
  const existing = (await Complement.findById(id).exec()) as
    | ComplementDocument
    | null;
  if (!existing) {
    throw { status: 404, message: 'Complemento no encontrado' };
  }
  const updated = (await Complement.findByIdAndUpdate(
    id,
    { $set: { isActive: !existing.isActive } },
    { new: true },
  ).exec()) as ComplementDocument | null;
  if (!updated) {
    throw { status: 404, message: 'Complemento no encontrado' };
  }
  return updated;
}

export async function deleteWithProtection(id: string): Promise<void> {
  const Complement = getComplementModel();
  const existing = await Complement.findById(id).exec();
  if (!existing) {
    throw { status: 404, message: 'Complemento no encontrado' };
  }

  const usage = await getComplementUsageCount(id);
  if (usage > 0) {
    throw {
      status: 409,
      message:
        'No se puede eliminar el complemento: está en uso por recetas o bandejas activas',
    };
  }

  await Complement.deleteOne({ _id: id }).exec();
}

export async function getComplementUsageCount(id: string): Promise<number> {
  const Recipe = getRecipeModel();
  const Tray = getTrayModel();
  const oid = new Types.ObjectId(id);
  const [recipeCount, trayCount] = await Promise.all([
    Recipe.countDocuments({ 'complements.complementId': oid }).exec(),
    Tray.countDocuments({ 'complements.complementId': oid }).exec(),
  ]);
  return recipeCount + trayCount;
}

async function getComplementUsageCounts(
  ids: Types.ObjectId[] | string[],
): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const Recipe = getRecipeModel();
  const Tray = getTrayModel();
  const oids = ids.map((i) => new Types.ObjectId(i.toString()));

  const [recipeAgg, trayAgg] = await Promise.all([
    Recipe.aggregate([
      { $unwind: '$complements' },
      { $match: { 'complements.complementId': { $in: oids } } },
      { $group: { _id: '$complements.complementId', count: { $sum: 1 } } },
    ]),
    Tray.aggregate([
      { $unwind: '$complements' },
      { $match: { 'complements.complementId': { $in: oids } } },
      { $group: { _id: '$complements.complementId', count: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map<string, number>();
  for (const row of [...recipeAgg, ...trayAgg]) {
    const k = row._id.toString();
    map.set(k, (map.get(k) ?? 0) + row.count);
  }
  return map;
}

// Reset `customSellingPrice` on every recipe and tray that references this
// complement in its `complements[]` array. Mirrors the existing cascade
// behavior for ingredient cost changes (REQ-PRI-5 / REQ-REC-15 / REQ-TRA-13).
async function cascadeResetCustomSellingPrice(
  complementId: string,
): Promise<void> {
  const Recipe = getRecipeModel();
  const Tray = getTrayModel();
  const oid = new Types.ObjectId(complementId);

  const [recipeResult, trayResult] = await Promise.all([
    Recipe.updateMany(
      { 'complements.complementId': oid, customSellingPrice: { $ne: null } },
      { $set: { customSellingPrice: null } },
    ).exec(),
    Tray.updateMany(
      { 'complements.complementId': oid, customSellingPrice: { $ne: null } },
      { $set: { customSellingPrice: null } },
    ).exec(),
  ]);

  const total =
    (recipeResult.modifiedCount ?? 0) + (trayResult.modifiedCount ?? 0);
  if (total > 0) {
    console.log(
      `Cascade reset customSellingPrice for complement ${complementId}: ` +
        `${recipeResult.modifiedCount ?? 0} recipes, ` +
        `${trayResult.modifiedCount ?? 0} trays`,
    );
  }
}
