export interface Ingredient {
  _id: string;
  name: string;
  unit: string;
  costPerKg: number;
  costPer100g: number;
  costPerUnit: number;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterPurchasePayload {
  ingredientName: string;
  isNew?: boolean;
  ingredientId?: string;
  unit?: string;
  quantityPurchased: number;
  pricePaid: number;
}

export interface UpdateIngredientPayload {
  name?: string;
  unit?: string;
  costPerKg?: number;
  costPer100g?: number;
  costPerUnit?: number;
}
