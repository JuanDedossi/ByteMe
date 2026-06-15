import {
  getProfitRuleModel,
  ProfitRuleDocument,
} from '../models/profit-rule.model';

export interface CreateProfitRuleInput {
  name: string;
  description?: string;
  markupPercentage: number;
}

export interface UpdateProfitRuleInput {
  name?: string;
  description?: string;
  markupPercentage?: number;
}

export async function findAllProfitRules(): Promise<ProfitRuleDocument[]> {
  const ProfitRule = getProfitRuleModel();
  const result = await ProfitRule.find().sort({ name: 1 }).exec();
  return result as ProfitRuleDocument[];
}

export async function findProfitRuleById(
  id: string,
): Promise<ProfitRuleDocument> {
  const ProfitRule = getProfitRuleModel();
  const rule = await ProfitRule.findById(id).exec();
  if (!rule) {
    throw { status: 404, message: 'Profit rule not found' };
  }
  return rule as ProfitRuleDocument;
}

export async function createProfitRule(
  dto: CreateProfitRuleInput,
): Promise<ProfitRuleDocument> {
  const ProfitRule = getProfitRuleModel();
  const existing = await ProfitRule.findOne({
    name: { $regex: `^${dto.name}$`, $options: 'i' },
  }).exec();
  if (existing) {
    throw {
      status: 409,
      message: `Ya existe una regla con el nombre "${dto.name}"`,
    };
  }
  const result = await ProfitRule.create({ ...dto, isDefault: false });
  return result as ProfitRuleDocument;
}

export async function updateProfitRule(
  id: string,
  dto: UpdateProfitRuleInput,
): Promise<ProfitRuleDocument> {
  const ProfitRule = getProfitRuleModel();
  const rule = await findProfitRuleById(id);

  if (dto.name && dto.name !== rule.name) {
    const existing = await ProfitRule.findOne({
      name: { $regex: `^${dto.name}$`, $options: 'i' },
      _id: { $ne: id },
    }).exec();
    if (existing) {
      throw {
        status: 409,
        message: `Ya existe una regla con el nombre "${dto.name}"`,
      };
    }
  }

  const updated = (await ProfitRule.findByIdAndUpdate(
    id,
    { $set: dto },
    { new: true },
  ).exec()) as ProfitRuleDocument | null;
  if (!updated) {
    throw { status: 404, message: 'Regla de ganancia no encontrada' };
  }
  return updated;
}

export async function deleteProfitRule(id: string): Promise<void> {
  const ProfitRule = getProfitRuleModel();
  await findProfitRuleById(id);
  await ProfitRule.findByIdAndDelete(id).exec();
}
