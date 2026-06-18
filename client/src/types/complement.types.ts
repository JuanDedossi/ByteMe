// Client-side Complement types.
// Mirrors shared/src/types/complement.ts. Kept as a local copy to match the
// existing client pattern (every other module — ingredient, recipe, tray —
// defines its own types directly under client/src/types/).

export type ComplementUnit = 'unidad' | 'metro';

export const COMPLEMENT_UNITS: readonly ComplementUnit[] = ['unidad', 'metro'] as const;

export interface Complement {
  _id: string;
  name: string;
  unit: ComplementUnit;
  costPerUnit: number;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComplementEntry {
  complementId: string;
  quantity: number;
}

export interface CreateComplementPayload {
  name: string;
  unit: ComplementUnit;
  costPerUnit: number;
}

export type UpdateComplementPayload = Partial<CreateComplementPayload>;
