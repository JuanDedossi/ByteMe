// Shared Complement types for the add-complementos-class feature.
// Naming: "Complementos" in Spanish UI; "Complement" in code.

export type ComplementUnit = 'unidad' | 'metro';

export const COMPLEMENT_UNITS: readonly ComplementUnit[] = [
  'unidad',
  'metro',
] as const;

export interface IComplement {
  _id?: string;
  name: string;
  unit: ComplementUnit;
  costPerUnit: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Reference shape used inside Recipe.complements[] and Tray.complements[].
// _id (complementId) and quantity are the only persisted fields.
export interface IComplementEntry {
  complementId: string;
  quantity: number;
}

export interface IComplementWithUsage extends IComplement {
  usageCount: number;
}

export interface CreateComplementPayload {
  name: string;
  unit: ComplementUnit;
  costPerUnit: number;
}

export type UpdateComplementPayload = Partial<CreateComplementPayload>;
