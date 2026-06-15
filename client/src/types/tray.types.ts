export interface TrayRecipe {
  recipeId: string;
  recipeName: string;
  recipeSellUnit: string;
  recipeYieldUnits: number;
  recipeYieldGrams: number;
  quantity: number;
  cost: number;
}

export interface Tray {
  _id: string;
  name: string;
  recipes: TrayRecipe[];
  cost: number;
  profitRuleId: string;
  profitRuleName: string;
  markupPercentage: number;
  sellingPrice: number;
  customSellingPrice: number | null;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrayPayload {
  name: string;
  recipes: { recipeId: string; quantity: number }[];
  profitRuleId: string;
}

export interface UpdateTrayPayload {
  name?: string;
  recipes?: { recipeId: string; quantity: number }[];
  profitRuleId?: string;
}
